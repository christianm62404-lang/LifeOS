"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { documentSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createDocument(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = documentSchema.safeParse({
    title: formData.get("title"),
    documentType: formData.get("documentType"),
    expirationDate: formData.get("expirationDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const file = formData.get("file");
  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: "File is larger than 10 MB" };
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(env.documentsBucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (uploadError) {
      return { ok: false, error: `Upload failed: ${uploadError.message}` };
    }
    filePath = path;
    fileName = file.name;
    fileSize = file.size;
  }

  const d = parsed.data;
  const { error } = await supabase.from("documents").insert({
    user_id: user.id,
    title: d.title,
    document_type: d.documentType,
    expiration_date: d.expirationDate || null,
    notes: d.notes ?? null,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
  });

  if (error) {
    // Roll back the uploaded object if metadata insert fails.
    if (filePath) {
      await supabase.storage.from(env.documentsBucket).remove([filePath]);
    }
    return { ok: false, error: error.message };
  }

  await logActivity(supabase, {
    userId: user.id,
    entityType: "document",
    action: "created",
    description: `Uploaded document "${d.title}"`,
  });

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { ok: true, message: "Document saved" };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  if (doc?.file_path) {
    await supabase.storage.from(env.documentsBucket).remove([doc.file_path]);
  }

  await logActivity(supabase, {
    userId: user.id,
    entityType: "document",
    entityId: id,
    action: "deleted",
    description: "Deleted a document",
  });

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return { ok: true, message: "Document deleted" };
}

/** Creates a short-lived signed URL so the user can download their file. */
export async function getDocumentUrl(
  filePath: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase.storage
    .from(env.documentsBucket)
    .createSignedUrl(filePath, 60);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create link" };
  }
  return { ok: true, url: data.signedUrl };
}
