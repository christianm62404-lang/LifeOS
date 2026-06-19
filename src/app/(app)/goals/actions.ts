"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema, type GoalInput } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { ensureFeature } from "@/lib/entitlements";
import type { ActionResult } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createGoal(input: GoalInput): Promise<ActionResult> {
  const guard = await ensureFeature("goals");
  if (!guard.ok) return guard;

  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: d.title,
    category: d.category,
    target_date: d.targetDate ?? null,
    progress: d.progress,
    status: d.status,
    notes: d.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "goal",
    action: "created",
    description: `Added goal "${d.title}"`,
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true, message: "Goal added" };
}

export async function updateGoal(
  id: string,
  input: GoalInput,
): Promise<ActionResult> {
  const guard = await ensureFeature("goals");
  if (!guard.ok) return guard;

  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase
    .from("goals")
    .update({
      title: d.title,
      category: d.category,
      target_date: d.targetDate ?? null,
      progress: d.progress,
      status: d.status,
      notes: d.notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "goal",
    entityId: id,
    action: "updated",
    description: `Updated goal "${d.title}"`,
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true, message: "Goal updated" };
}

export async function updateGoalProgress(
  id: string,
  progress: number,
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const { data, error } = await supabase
    .from("goals")
    .update({
      progress: clamped,
      ...(clamped === 100 ? { status: "completed" } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("title")
    .single();

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "goal",
    entityId: id,
    action: "progress",
    description: `Updated progress on "${data.title}" to ${clamped}%`,
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true, message: "Progress updated" };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "goal",
    entityId: id,
    action: "deleted",
    description: "Deleted a goal",
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true, message: "Goal deleted" };
}
