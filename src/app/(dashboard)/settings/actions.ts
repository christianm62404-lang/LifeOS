"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { profileSchema, type ProfileValues } from "@/lib/validations";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateProfile(
  values: ProfileValues,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data.full_name })
      .eq("id", user.id);
    if (error) throw error;

    // Keep auth metadata in sync.
    await supabase.auth.updateUser({
      data: { full_name: parsed.data.full_name },
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}
