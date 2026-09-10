"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; notice?: string };

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/home";
}

async function origin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const next = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signUp({
    email,
    password: String(formData.get("password") ?? ""),
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error) return { error: error.message };

  // With email confirmation on, signUp returns a user but no session.
  if (!data.session) {
    return { notice: `Check ${email} for a confirmation link to finish signing up.` };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Could not start Google sign-in.")}`);
  }

  redirect(data.url);
}
