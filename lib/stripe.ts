// lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Typen sind im Paket enthalten
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export default stripe;
