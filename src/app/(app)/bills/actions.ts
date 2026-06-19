"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { billSchema, type BillInput } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createBill(input: BillInput): Promise<ActionResult> {
  const parsed = billSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase.from("bills").insert({
    user_id: user.id,
    name: d.name,
    amount: d.amount,
    due_date: d.dueDate,
    recurrence: d.recurrence,
    autopay: d.autopay,
    category: d.category,
    notes: d.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "bill",
    action: "created",
    description: `Added bill "${d.name}"`,
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true, message: "Bill added" };
}

export async function updateBill(
  id: string,
  input: BillInput,
): Promise<ActionResult> {
  const parsed = billSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const d = parsed.data;
  const { error } = await supabase
    .from("bills")
    .update({
      name: d.name,
      amount: d.amount,
      due_date: d.dueDate,
      recurrence: d.recurrence,
      autopay: d.autopay,
      category: d.category,
      notes: d.notes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "bill",
    entityId: id,
    action: "updated",
    description: `Updated bill "${d.name}"`,
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true, message: "Bill updated" };
}

export async function toggleBillPaid(
  id: string,
  isPaid: boolean,
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bills")
    .update({
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("name")
    .single();

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "bill",
    entityId: id,
    action: isPaid ? "paid" : "unpaid",
    description: `Marked bill "${data.name}" as ${isPaid ? "paid" : "unpaid"}`,
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true, message: isPaid ? "Marked as paid" : "Marked as unpaid" };
}

export async function deleteBill(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("bills")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  await logActivity(supabase, {
    userId: user.id,
    entityType: "bill",
    entityId: id,
    action: "deleted",
    description: "Deleted a bill",
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true, message: "Bill deleted" };
}
