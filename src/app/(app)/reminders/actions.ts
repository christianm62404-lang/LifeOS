"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reminderSchema, type ReminderInput } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createReminder(
  input: ReminderInput,
): Promise<ActionResult> {
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase.from("reminders").insert({
    user_id: user.id,
    title: d.title,
    due_date: d.dueDate,
    recurrence: d.recurrence,
    priority: d.priority,
    notes: d.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "reminder",
    action: "created",
    description: `Added reminder "${d.title}"`,
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true, message: "Reminder added" };
}

export async function updateReminder(
  id: string,
  input: ReminderInput,
): Promise<ActionResult> {
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase
    .from("reminders")
    .update({
      title: d.title,
      due_date: d.dueDate,
      recurrence: d.recurrence,
      priority: d.priority,
      notes: d.notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "reminder",
    entityId: id,
    action: "updated",
    description: `Updated reminder "${d.title}"`,
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true, message: "Reminder updated" };
}

export async function toggleReminderComplete(
  id: string,
  isComplete: boolean,
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("reminders")
    .update({
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("title")
    .single();

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "reminder",
    entityId: id,
    action: isComplete ? "completed" : "reopened",
    description: `Marked reminder "${data.title}" as ${
      isComplete ? "complete" : "incomplete"
    }`,
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: isComplete ? "Marked as complete" : "Marked as incomplete",
  };
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "reminder",
    entityId: id,
    action: "deleted",
    description: "Deleted a reminder",
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true, message: "Reminder deleted" };
}
