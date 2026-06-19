"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/data";
import { receiptSchema, type ReceiptValues } from "@/lib/validations";
import { extractReceipt } from "@/lib/ai/extract";
import { STORAGE_BUCKET } from "@/lib/constants";
import type { ExtractedReceipt } from "@/lib/types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/**
 * Run extraction against an already-uploaded storage object. Falls back to the
 * deterministic mock extractor when no AI key is configured.
 */
export async function extractFromStorage(
  filePath: string,
  fileName: string,
  fileType: string,
): Promise<ActionResult<{ extracted: ExtractedReceipt; source: "ai" | "mock" }>> {
  try {
    const { supabase } = await requireUser();

    let base64: string | undefined;
    if (process.env.OPENAI_API_KEY && fileType.startsWith("image/")) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        base64 = buffer.toString("base64");
      }
    }

    const result = await extractReceipt({ fileName, fileType, base64 });
    return { ok: true, data: { extracted: result.data, source: result.source } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Persist a new receipt and its items. */
export async function createReceipt(
  values: ReceiptValues,
  file: { filePath: string | null; fileType: string | null },
): Promise<ActionResult<{ id: string }>> {
  const parsed = receiptSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  try {
    const { supabase, user } = await requireUser();
    const { items, ...receipt } = parsed.data;

    const { data: inserted, error } = await supabase
      .from("receipts")
      .insert({
        user_id: user.id,
        merchant_name: receipt.merchant_name,
        purchase_date: receipt.purchase_date,
        total_amount: receipt.total_amount ?? null,
        category: receipt.category,
        payment_method: receipt.payment_method,
        warranty_expiration: receipt.warranty_expiration,
        return_deadline: receipt.return_deadline,
        notes: receipt.notes,
        file_url: file.filePath,
        file_type: file.fileType,
      })
      .select("id")
      .single();

    if (error) throw error;

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("receipt_items").insert(
        items.map((item) => ({
          receipt_id: inserted.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price ?? null,
          warranty_months: item.warranty_months ?? null,
        })),
      );
      if (itemsError) throw itemsError;
    }

    revalidatePath("/dashboard");
    revalidatePath("/receipts");
    return { ok: true, data: { id: inserted.id } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Update an existing receipt and replace its items. */
export async function updateReceipt(
  id: string,
  values: ReceiptValues,
): Promise<ActionResult> {
  const parsed = receiptSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  try {
    const { supabase, user } = await requireUser();
    const { items, ...receipt } = parsed.data;

    const { error } = await supabase
      .from("receipts")
      .update({
        merchant_name: receipt.merchant_name,
        purchase_date: receipt.purchase_date,
        total_amount: receipt.total_amount ?? null,
        category: receipt.category,
        payment_method: receipt.payment_method,
        warranty_expiration: receipt.warranty_expiration,
        return_deadline: receipt.return_deadline,
        notes: receipt.notes,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    // Replace items wholesale — simplest correct approach for an MVP.
    await supabase.from("receipt_items").delete().eq("receipt_id", id);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("receipt_items").insert(
        items.map((item) => ({
          receipt_id: id,
          name: item.name,
          quantity: item.quantity,
          price: item.price ?? null,
          warranty_months: item.warranty_months ?? null,
        })),
      );
      if (itemsError) throw itemsError;
    }

    revalidatePath("/dashboard");
    revalidatePath("/receipts");
    revalidatePath(`/receipts/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Delete a receipt, its items (cascade) and its stored file. */
export async function deleteReceipt(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { data: receipt } = await supabase
      .from("receipts")
      .select("file_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;

    if (receipt?.file_url) {
      await supabase.storage.from(STORAGE_BUCKET).remove([receipt.file_url]);
    }

    revalidatePath("/dashboard");
    revalidatePath("/receipts");
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }

  redirect("/receipts");
}

/** Create a short-lived signed URL to view/download the original file. */
export async function getFileUrl(
  filePath: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60 * 10);
    if (error) throw error;
    return { ok: true, data: { url: data.signedUrl } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
