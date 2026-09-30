import { Stripe } from "stripe";
export const StripeHandler = new Stripe(process.env.STRIPE_SECRET_KEY!);