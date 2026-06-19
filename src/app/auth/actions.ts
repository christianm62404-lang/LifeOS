"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signUpSchema } from "@/lib/validations";
import { env } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/types";

const TOO_MANY = "Too many attempts. Please wait a minute and try again.";

export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // 10 attempts per minute per client IP.
  if (!rateLimit(await clientKey("login"), 10, 60_000).ok) {
    return { ok: false, error: TOO_MANY };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // 5 sign-ups per minute per client IP.
  if (!rateLimit(await clientKey("signup"), 5, 60_000).ok) {
    return { ok: false, error: TOO_MANY };
  }

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // When email confirmation is disabled, a session is returned immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    ok: true,
    message: "Check your email to confirm your account, then sign in.",
  };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
