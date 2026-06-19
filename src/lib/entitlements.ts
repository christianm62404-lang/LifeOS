import "server-only";
import { createClient } from "@/lib/supabase/server";
import { billingEnabled } from "@/lib/env";
import {
  tierIncludesFeature,
  type Feature,
  type Tier,
} from "@/lib/billing";

export interface Entitlement {
  tier: Tier;
  status: string;
  currentPeriodEnd: string | null;
}

/**
 * Resolve the current user's entitlement.
 *
 * When billing is disabled (the default for local dev), everyone is treated
 * as Pro so the whole app is usable without Stripe. When BILLING_ENABLED=true,
 * the tier is read from the `user_billing` table, which only the Stripe
 * webhook (service-role) can write — users cannot escalate their own tier.
 */
export async function getEntitlement(): Promise<Entitlement> {
  if (!billingEnabled) {
    return { tier: "pro", status: "billing_disabled", currentPeriodEnd: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tier: "free", status: "unauthenticated", currentPeriodEnd: null };
  }

  const { data } = await supabase
    .from("user_billing")
    .select("tier, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    return { tier: "free", status: "inactive", currentPeriodEnd: null };
  }

  return {
    tier: (data.tier as Tier) ?? "free",
    status: data.status ?? "inactive",
    currentPeriodEnd: data.current_period_end ?? null,
  };
}

/** Cheap check: does the current user have access to a feature? */
export async function hasFeature(feature: Feature): Promise<boolean> {
  const { tier } = await getEntitlement();
  return tierIncludesFeature(tier, feature);
}

/**
 * Guard for server actions. Returns an error result when the user is not
 * entitled, so callers can short-circuit before touching the database.
 */
export async function ensureFeature(
  feature: Feature,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await hasFeature(feature)) return { ok: true };
  return {
    ok: false,
    error: "This feature requires an upgrade to your plan.",
  };
}
