"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { devEmail, devLoginEnabled, personaFor } from "@/lib/dev-auth";

export type DevLoginState = { error?: string };

/**
 * Signs in as a seeded persona.
 *
 * A Server Action is its own callable endpoint, reachable without ever
 * rendering the page — so the guard is repeated here rather than trusted from
 * the page that renders the button.
 *
 * No password is involved: the admin API generates a one-time magic-link token
 * which is immediately exchanged for a session. That means these accounts have
 * no credential to leak, and seeding them somewhere they do not belong does not
 * hand anyone a way in.
 */
export async function signInAsPersona(
  _prev: DevLoginState,
  formData: FormData,
): Promise<DevLoginState> {
  if (!devLoginEnabled()) return { error: "Dev login is disabled." };

  const key = String(formData.get("persona") ?? "");
  const persona = personaFor(key);
  if (!persona) return { error: `Unknown persona "${key}".` };

  const email = devEmail(persona.key);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set — run npm run dev:seed first." };
  }

  // magiclink creates the account if it is missing, so this succeeds even
  // before the seed has run — you just get a persona with no progress on it.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });

  if (error || !data.properties?.hashed_token) {
    return { error: error?.message ?? "Could not generate a sign-in token." };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });

  if (verifyError) return { error: verifyError.message };

  revalidatePath("/", "layout");
  redirect("/home");
}
