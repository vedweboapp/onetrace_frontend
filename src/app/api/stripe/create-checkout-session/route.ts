import { NextResponse } from "next/server";
import { StripeHandler } from "@/shared/utils/stripe";

export const runtime = "nodejs";

type CreateCheckoutBody = {
  amountPence?: number;
  currency?: string;
  customerEmail?: string;
  productName?: string;
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
    const successUrl = body.successUrl?.trim();
    const cancelUrl = body.cancelUrl?.trim();
    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing success or cancel URL." },
        { status: 400 },
      );
    }

    // ── Create session (secret key stays server-side) ─────────────────────────
    const session = await StripeHandler.checkout.sessions.create(
      {
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
        // All metadata is forwarded to the webhook and to the verify-session endpoint
        metadata: body.metadata ?? {},
        // Prevent duplicate Stripe sessions when the user double-clicks
        payment_intent_data: {
          metadata: body.metadata ?? {},
        },
      },
      // Idempotency key prevents charging the customer twice for the same action
      body.idempotencyKey
        ? { idempotencyKey: body.idempotencyKey }
        : undefined,
    );

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
