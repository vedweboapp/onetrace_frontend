import { NextResponse } from "next/server";
import { getStripe } from "@/shared/utils/stripe";

type CreateCheckoutBody = {
  amountPence?: number;
  currency?: string;
  customerEmail?: string;
  productName?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCheckoutBody;
    const amountPence = Math.round(Number(body.amountPence));
    if (!Number.isFinite(amountPence) || amountPence < 1) {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }
    const successUrl = body.successUrl?.trim();
    const cancelUrl = body.cancelUrl?.trim();
    if (!successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Missing success or cancel URL." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: body.customerEmail?.trim() || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (body.currency || "gbp").toLowerCase(),
            unit_amount: amountPence,
            product_data: {
              name: body.productName?.trim() || "SimHo order",
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: body.metadata ?? {},
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Stripe checkout.";
    console.error("[stripe/create-checkout-session]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
