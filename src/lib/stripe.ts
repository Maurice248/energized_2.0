import Stripe from "stripe";
import { env } from "@/env";

export const STRIPE_ENABLED = Boolean(env.STRIPE_SECRET_KEY);

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe not configured: STRIPE_SECRET_KEY missing.");
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}
