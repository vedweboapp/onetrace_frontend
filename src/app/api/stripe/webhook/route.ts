import { NextResponse } from "next/server";
import { StripeHandler } from "@/shared/utils/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Stripe sends signed events here. We verify the signature with the
 * STRIPE_WEBHOOK_SECRET (raw body must not be parsed before verification).
 *
 * Security notes:
 *  - Raw body is read as text so the HMAC signature is validated correctly.
 *  - We return 200 immediately after verification to prevent Stripe retries.
 *  - Heavy processing should be done asynchronously (fire-and-forget).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  let event;
  try {
    // Raw body MUST be read before any JSON parsing — required for HMAC verification
    const rawBody = await request.text();
    event = StripeHandler.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook signature verification failed.";
    console.error("[stripe/webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── Handle events ─────────────────────────────────────────────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const paid = session.payment_status === "paid";

      console.info(
        `[stripe/webhook] checkout.session.completed | id=${session.id} | paid=${paid} | email=${session.customer_details?.email}`,
      );

      // The primary order submission happens on the client success page after
      // verify-session confirms payment. This webhook acts as a reliable
      // fallback to log and trigger any server-side fulfilment logic.
      if (paid) {
        // TODO: If you need guaranteed server-side fulfilment independent of
        // the client completing the redirect, call your backend here using
        // session.metadata (kioskId, token, etc.) to reconstruct the order.
        console.info(
          "[stripe/webhook] Payment confirmed. Metadata:",
          JSON.stringify(session.metadata),
        );
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      console.warn(
        `[stripe/webhook] payment_intent.payment_failed | id=${pi.id} | reason=${pi.last_payment_error?.message}`,
      );
      break;
    }

    default:
      // Acknowledge unhandled events so Stripe doesn't keep retrying
      break;
  }

  // Always return 200 so Stripe doesn't retry the webhook
  return NextResponse.json({ received: true });
}
