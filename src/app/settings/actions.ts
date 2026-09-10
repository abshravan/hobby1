"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TonePreference } from "@/lib/types";

export type SettingsState = { error?: string; saved?: boolean };

const TONES: TonePreference[] = ["roast", "motivate"];

export async function setTonePreference(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const value = String(formData.get("tone") ?? "");
  if (!TONES.includes(value as TonePreference)) {
    return { error: `Unknown tone "${value}".` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — sign in again." };

  // RLS restricts updates to the caller's own row; the id filter keeps the
  // statement honest rather than relying on the policy alone.
  const { error } = await supabase
    .from("users")
    .update({ tone_preference: value as TonePreference })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { saved: true };
}
