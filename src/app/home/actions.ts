"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyItemToggle } from "@/lib/checklist-queries";

export type ToggleResult = { error?: string };

/**
 * Checks or unchecks a single item for the signed-in user.
 *
 * The user id comes from the verified session, never from the client, so a
 * caller cannot write progress onto someone else's account. RLS enforces the
 * same rule again at the database.
 */
export async function setItemCompleted(
  itemId: string,
  completed: boolean,
): Promise<ToggleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired — sign in again." };

  const result = await applyItemToggle(supabase, user.id, itemId, completed);
  if (result.error) return result;

  // A check is the "meaningful action" the streak and inactivity triggers key
  // off (Steps 7 and 8). Recording it now means those steps have real history
  // to read rather than starting from an empty column.
  await supabase
    .from("users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/home");
  return {};
}
