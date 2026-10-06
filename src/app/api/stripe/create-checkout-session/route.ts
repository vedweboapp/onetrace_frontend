import { NextResponse } from "next/server";
import { getStripe } from "@/shared/utils/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unescapeStripeSessionPlaceholder(url: string): string {
  return url.replace(/%7BCHECKOUT_SESSION_ID%7D/gi, "{CHECKOUT_SESSION_ID}");
}

type CreateCheckoutBody = {
  amountPence?: number;
  currency?: string;
  customerEmail?: string;
  productName?: string;
  productDescription?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
  /** Arbitrary metadata forwarded to the Stripe session (e.g. kioskId, token) */
  metadata?: Record<string, string>;
  /** Idempotency key so duplicate POSTs never create duplicate charges */
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCheckoutBody;

    // ── Amount validation ────────────────────────────────────────────────────
    const amountPence = Math.round(Number(body.amountPence));
    if (!Number.isFinite(amountPence) || amountPence < 50) {
      // Stripe minimum is 50 pence (£0.50)
      return NextResponse.json(
        { error: "Invalid payment amount. Minimum is £0.50." },
        { status: 400 },
      );
    }

    // ── URL validation ────────────────────────────────────────────────────────
    const successUrl = unescapeStripeSessionPlaceholder(body.successUrl?.trim() ?? "");
    const cancelUrl = body.cancelUrl?.trim();
    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing success or cancel URL." },
        { status: 400 },
      );
    }

    const productName = body.productName?.trim() || "SimHo order";
    const productDescription = (body.productDescription?.trim() || "Configured product payment").slice(0, 500);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      locale: "en-GB",
      customer_email: body.customerEmail?.trim() || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (body.currency || "gbp").toLowerCase(),
            unit_amount: amountPence,
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: body.metadata ?? {},
      client_reference_id: body.metadata?.kiosk_id?.slice(0, 200),
      custom_text: {
        submit: {
          message: "Your order is recorded after this payment is completed.",
        },
      },
      payment_intent_data: {
        description: productName.slice(0, 1000),
        ...(body.customerName?.trim()
          ? { metadata: { customer_name: body.customerName.trim().slice(0, 200) } }
          : {}),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start Stripe checkout.";
    console.error("[stripe/create-checkout-session]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
