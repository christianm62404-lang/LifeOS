import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";

/**
 * Service-role Supabase client. BYPASSES Row Level Security, so it must only
 * ever be used in trusted server contexts (e.g. the Stripe webhook) and never
 * with user-supplied filters that could leak data. The `server-only` import
 * guarantees this module can never be bundled into client code.
 */
export function createAdminClient() {
  const key = serverEnv.supabaseServiceRoleKey;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for billing webhooks.",
    );
  }
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
