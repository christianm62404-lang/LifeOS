import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

let cached: Stripe | null = null;

/**
 * Lazily-created Stripe client. Throws only when actually used without a key,
 * so the app still builds and runs locally when Stripe is not configured.
 */
export function getStripe(): Stripe {
  if (!serverEnv.stripeSecretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure Stripe to enable billing.",
    );
  }
  if (!cached) {
    cached = new Stripe(serverEnv.stripeSecretKey, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
      appInfo: { name: "LifeOS" },
    });
  }
  return cached;
}

/** Map a Stripe price ID back to an internal tier. */
export function priceIdToTier(priceId: string | null | undefined) {
  if (!priceId) return null;
  if (priceId === serverEnv.stripePersonalPriceId) return "personal" as const;
  if (priceId === serverEnv.stripeProPriceId) return "pro" as const;
  return null;
}

/** Map an internal tier to its configured Stripe price ID. */
export function tierToPriceId(tier: "personal" | "pro"): string {
  return tier === "personal"
    ? serverEnv.stripePersonalPriceId
    : serverEnv.stripeProPriceId;
}
