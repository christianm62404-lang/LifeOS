"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, tierToPriceId } from "@/lib/stripe";
import { env, isStripeConfigured } from "@/lib/env";

type UrlResult = { ok: true; url: string } | { ok: false; error: string };

async function getOrCreateCustomerId(
  userId: string,
  email: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data: billing } = await admin
    .from("user_billing")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (billing?.stripe_customer_id) return billing.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await admin
    .from("user_billing")
    .upsert(
      { user_id: userId, stripe_customer_id: customer.id },
      { onConflict: "user_id" },
    );

  return customer.id;
}

/** Start a Stripe Checkout session for upgrading to a paid tier. */
export async function startCheckout(
  tier: "personal" | "pro",
): Promise<UrlResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "Not authenticated." };
  }

  try {
    const customerId = await getOrCreateCustomerId(user.id, user.email);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: tierToPriceId(tier), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${env.siteUrl}/billing?status=success`,
      cancel_url: `${env.siteUrl}/billing?status=cancelled`,
      // Tie the subscription back to the user for the webhook.
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
    });

    if (!session.url) return { ok: false, error: "Could not start checkout." };
    return { ok: true, url: session.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Checkout failed.",
    };
  }
}

/** Open the Stripe Customer Portal so users can manage/cancel their plan. */
export async function openBillingPortal(): Promise<UrlResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: "Not authenticated." };

  try {
    const customerId = await getOrCreateCustomerId(user.id, user.email);
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.siteUrl}/billing`,
    });
    return { ok: true, url: session.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not open portal.",
    };
  }
}
