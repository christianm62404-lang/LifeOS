import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEntity } from "@/lib/types";

/**
 * Records an entry in the activity feed. Failures are swallowed so that a
 * logging hiccup never blocks the user's primary action.
 */
export async function logActivity(
  supabase: SupabaseClient,
  params: {
    userId: string;
    entityType: ActivityEntity;
    entityId?: string | null;
    action: string;
    description: string;
  },
): Promise<void> {
  try {
    await supabase.from("activity_logs").insert({
      user_id: params.userId,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      action: params.action,
      description: params.description,
    });
  } catch {
    // Non-critical — ignore.
  }
}
