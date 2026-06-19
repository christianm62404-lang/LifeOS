"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  subscriptionSchema,
  type SubscriptionInput,
} from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createSubscription(
  input: SubscriptionInput,
): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    name: d.name,
    amount: d.amount,
    billing_cycle: d.billingCycle,
    next_billing_date: d.nextBillingDate,
    category: d.category,
    cancellation_link: d.cancellationLink ?? null,
    notes: d.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "subscription",
    action: "created",
    description: `Added subscription "${d.name}"`,
  });

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { ok: true, message: "Subscription added" };
}

export async function updateSubscription(
  id: string,
  input: SubscriptionInput,
): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase
    .from("subscriptions")
    .update({
      name: d.name,
      amount: d.amount,
      billing_cycle: d.billingCycle,
      next_billing_date: d.nextBillingDate,
      category: d.category,
      cancellation_link: d.cancellationLink ?? null,
      notes: d.notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "subscription",
    entityId: id,
    action: "updated",
    description: `Updated subscription "${d.name}"`,
  });

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { ok: true, message: "Subscription updated" };
}

export async function toggleSubscriptionActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      is_active: isActive,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("name")
    .single();

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "subscription",
    entityId: id,
    action: isActive ? "activated" : "deactivated",
    description: `Marked subscription "${data.name}" as ${
      isActive ? "active" : "inactive"
    }`,
  });

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: isActive ? "Marked as active" : "Marked as inactive",
  };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "subscription",
    entityId: id,
    action: "deleted",
    description: "Deleted a subscription",
  });

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { ok: true, message: "Subscription deleted" };
}
