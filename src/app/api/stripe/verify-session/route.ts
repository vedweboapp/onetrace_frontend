import { NextResponse } from "next/server";
import { getStripe } from "@/shared/utils/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id")?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      paid: session.payment_status === "paid",
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata ?? {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify Stripe session.";
    console.error("[stripe/verify-session]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
