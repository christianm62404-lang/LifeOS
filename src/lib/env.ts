/**
 * Centralised access to environment variables with friendly errors when
 * required ones are missing, so misconfiguration fails fast and clearly.
 *
 * Public vars (NEXT_PUBLIC_*) are safe in the browser. Server-only secrets
 * (Stripe, service-role) are read lazily via `serverEnv` so they never leak
 * into client bundles.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  documentsBucket:
    process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || "documents",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

/**
 * When billing is disabled (the default), every signed-in user is treated as
 * Pro so the app is fully usable locally without configuring Stripe. Set
 * BILLING_ENABLED=true to enforce real, paid entitlements.
 */
export const billingEnabled = process.env.BILLING_ENABLED === "true";

/** Server-only secrets. Never import this into a Client Component. */
export const serverEnv = {
  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY ?? "";
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? "";
  },
  get stripePersonalPriceId() {
    return process.env.STRIPE_PERSONAL_PRICE_ID ?? "";
  },
  get stripeProPriceId() {
    return process.env.STRIPE_PRO_PRICE_ID ?? "";
  },
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
};

/** Whether Stripe is fully configured (secret key + both price IDs). */
export function isStripeConfigured(): boolean {
  return Boolean(
    serverEnv.stripeSecretKey &&
      serverEnv.stripePersonalPriceId &&
      serverEnv.stripeProPriceId,
  );
}
