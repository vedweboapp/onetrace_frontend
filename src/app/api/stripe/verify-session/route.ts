import { NextResponse } from "next/server";
import { getStripe } from "@/shared/utils/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/verify-session?session_id=<stripeSessionId>
 *
 * Called from the client-side success page AFTER Stripe redirects back.
 * Only returns a success response when payment_status is "paid".
 * The secret key never leaves the server.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id")?.trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id." },
        { status: 400 },
      );
    }

    // Retrieve the full session from Stripe (server-side only)
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only report paid when Stripe confirms payment_status === "paid"
    const paid = session.payment_status === "paid";

    return NextResponse.json({
      paid,
      status: session.status,
      payment_status: session.payment_status,
      customer_email:
        session.customer_details?.email ?? session.customer_email ?? null,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      // Metadata contains kioskId, token, etc. that the success page needs
      metadata: session.metadata ?? {},
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not verify Stripe session.";
    console.error("[stripe/verify-session]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
