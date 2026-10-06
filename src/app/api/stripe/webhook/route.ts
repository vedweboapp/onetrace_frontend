import { NextResponse } from "next/server";
import { getStripe } from "@/shared/utils/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

    // Checkout completion is handled on the success URL (client verifies session then posts /checkout/).
    // Webhook is available for logging / future server-side fulfillment.
    if (event.type === "checkout.session.completed") {
      console.info("[stripe/webhook] checkout.session.completed", event.data.object.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook verification failed.";
    console.error("[stripe/webhook]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
