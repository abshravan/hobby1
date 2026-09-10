/**
 * Seeds development test accounts.
 *
 * Creates the personas behind /dev/login, plus a population of synthetic
 * "engaged" users so aggregate completion stats cross MIN_USERS_FOR_STATS and
 * the "X% of users have done this" hook is actually visible while developing.
 *
 *   npm run dev:seed              create/refresh personas + 40 synthetic users
 *   npm run dev:seed -- --users=0 personas only
 *   npm run dev:seed -- --clean   delete every dev account and its progress
 *
 * Refuses to run without ENABLE_DEV_LOGIN=true, so it cannot be pointed at a
 * production project by accident. Every account it creates uses the reserved
 * .test TLD and a dev- prefix, so --clean can find them all again.
 */

import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEV_PERSONAS, devEmail, isDevEmail } from "../src/lib/dev-auth";
import { MIN_USERS_FOR_STATS } from "../src/lib/stats";
import { personaItems, syntheticItems, type SeedableItem } from "../src/lib/dev-seed-data";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.ENABLE_DEV_LOGIN !== "true") {
  console.error(
    "Refusing to run: ENABLE_DEV_LOGIN is not \"true\".\n" +
      "This script creates sign-in-able accounts, so it only runs where dev login is on.",
  );
  process.exit(1);
}

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const clean = process.argv.includes("--clean");
const usersArg = process.argv.find((arg) => arg.startsWith("--users="));
// Enough to clear the stats threshold with room to spare, unless overridden.
const syntheticCount = usersArg
  ? Number(usersArg.split("=")[1])
  : MIN_USERS_FOR_STATS + 15;

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadItems(): Promise<SeedableItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("id, slug, difficulty, categories(slug)")
    .eq("is_active", true);

  if (error) throw new Error(`Could not read items: ${error.message}`);
  if (!data?.length) throw new Error("No items found — run npm run db:seed first.");

  return data.map((row) => ({
    id: row.id as string,
    difficulty: row.difficulty as string,
    categorySlug: (row.categories as unknown as { slug: string }).slug,
  }));
}

/** Finds an existing dev user by email, or creates one. Idempotent. */
async function ensureUser(email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { dev_seed: true },
  });

  if (!error && data.user) return data.user.id;

  // Already there — find the id rather than failing.
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  throw new Error(`Could not create ${email}: ${error?.message ?? "unknown error"}`);
}

async function findUserByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function writeProgress(userId: string, itemIds: string[]) {
  if (itemIds.length === 0) return;

  const now = new Date().toISOString();
  const rows = itemIds.map((itemId) => ({
    user_id: userId,
    item_id: itemId,
    status: "completed" as const,
    completed_at: now,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from("user_item_progress")
      .upsert(rows.slice(i, i + 500), { onConflict: "user_id,item_id" });
    if (error) throw new Error(`Could not write progress: ${error.message}`);
  }
}

async function removeDevUsers() {
  let removed = 0;
  // Deleting shifts pagination, so re-read page 1 until nothing matches.
  for (let guard = 0; guard < 200; guard++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(`Could not list users: ${error.message}`);

    const targets = data.users.filter((user) => isDevEmail(user.email));
    if (targets.length === 0) break;

    for (const user of targets) {
      // public.users and user_item_progress cascade from auth.users.
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw new Error(`Could not delete ${user.email}: ${deleteError.message}`);
      removed++;
    }
  }
  return removed;
}

async function main() {
  console.log(`Target: ${url}\n`);

  if (clean) {
    const removed = await removeDevUsers();
    console.log(`✓ removed ${removed} dev account${removed === 1 ? "" : "s"}`);
    await refreshStats();
    return;
  }

  const items = await loadItems();
  console.log(`Loaded ${items.length} active items.\n`);

  for (const persona of DEV_PERSONAS) {
    const email = devEmail(persona.key);
    const userId = await ensureUser(email);
    const chosen = personaItems(persona, items);

    await supabase
      .from("users")
      .update({ tone_preference: persona.tone, display_name: persona.name })
      .eq("id", userId);
    await writeProgress(userId, chosen);

    console.log(`✓ ${email.padEnd(28)} ${String(chosen.length).padStart(3)} items · ${persona.tone}`);
  }

  if (syntheticCount > 0) {
    console.log(`\nSeeding ${syntheticCount} synthetic users so completion stats appear…`);
    for (let index = 0; index < syntheticCount; index++) {
      const userId = await ensureUser(devEmail(`sim-${String(index).padStart(3, "0")}`));
      await writeProgress(userId, syntheticItems(index, items));
    }
    console.log(`✓ ${syntheticCount} synthetic users`);
  }

  await refreshStats();
  console.log(`\nDone. Sign in at http://localhost:3000/dev/login`);
}

async function refreshStats() {
  const { error } = await supabase.rpc("refresh_item_stats");
  console.log(error ? `! item_stats not refreshed: ${error.message}` : "✓ item_stats refreshed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
