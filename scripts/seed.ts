/**
 * Seeds reference data: categories, items, and the roast/motivate copy library.
 *
 * Idempotent — safe to run repeatedly. Rows are matched on their natural keys
 * (category.slug, item.slug, message trigger+tone+copy), so re-running updates
 * in place rather than duplicating, and existing user progress keeps pointing
 * at the same items.
 *
 *   npm run db:seed            upsert content
 *   npm run db:seed -- --prune deactivate items no longer in the content files
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY: seeding writes to RLS-protected tables
 * that no end user is allowed to write.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, TOTAL_ITEMS } from "../src/content/items";
import { MESSAGES } from "../src/content/messages";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env.local and fill both in before seeding.",
  );
  process.exit(1);
}

const prune = process.argv.includes("--prune");
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(label: string, error: { message: string }): never {
  console.error(`✕ ${label}: ${error.message}`);
  process.exit(1);
}

async function seedCategories() {
  const rows = CATEGORIES.map((category, index) => ({
    slug: category.slug,
    name: category.name,
    type: category.type,
    tagline: category.tagline,
    sort_order: index,
  }));

  const { data, error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (error) fail("categories", error);

  console.log(`✓ categories: ${data.length}`);
  return new Map(data.map((row) => [row.slug, row.id as string]));
}

async function seedItems(categoryIds: Map<string, string>) {
  const rows = CATEGORIES.flatMap((category) => {
    const categoryId = categoryIds.get(category.slug);
    if (!categoryId) throw new Error(`Category ${category.slug} was not seeded.`);

    return category.items.map((item, index) => ({
      category_id: categoryId,
      slug: item.slug,
      title: item.title,
      difficulty: item.difficulty,
      sort_order: index,
      is_active: true,
    }));
  });

  const { data, error } = await supabase
    .from("items")
    .upsert(rows, { onConflict: "slug" })
    .select("id");

  if (error) fail("items", error);
  console.log(`✓ items: ${data.length}`);

  if (!prune) return;

  // Deactivate rather than delete — user_item_progress rows must survive so a
  // removed item can be restored without losing anyone's history.
  const activeSlugs = rows.map((row) => row.slug);
  const { data: stale, error: pruneError } = await supabase
    .from("items")
    .update({ is_active: false })
    .not("slug", "in", `(${activeSlugs.map((s) => `"${s}"`).join(",")})`)
    .eq("is_active", true)
    .select("slug");

  if (pruneError) fail("prune", pruneError);
  if (stale.length) {
    console.log(`✓ deactivated ${stale.length}: ${stale.map((r) => r.slug).join(", ")}`);
  }
}

async function seedMessages() {
  const rows = MESSAGES.map((message) => ({
    trigger_type: message.trigger_type,
    tone: message.tone,
    copy_text: message.copy_text,
    micro_action: message.micro_action ?? null,
    is_active: true,
  }));

  // Belt-and-braces: the table has CHECK constraints for both of these, but
  // failing here names the offending line instead of surfacing a Postgres error.
  for (const row of rows) {
    if (row.tone === "roast" && !row.micro_action) {
      throw new Error(`Roast copy without a micro-action: "${row.copy_text}"`);
    }
    if (row.tone === "roast" && NEVER_ROAST.has(row.trigger_type)) {
      throw new Error(`Roast copy on a support-only trigger (${row.trigger_type})`);
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .upsert(rows, { onConflict: "trigger_type,tone,copy_text" })
    .select("id");

  if (error) fail("messages", error);
  console.log(`✓ messages: ${data.length}`);
}

const NEVER_ROAST = new Set([
  "needs_help_flag",
  "inactivity",
  "plateau",
  "streak_break",
  "distress_support",
]);

async function main() {
  console.log(`Seeding ${url}\n`);

  const categoryIds = await seedCategories();
  await seedItems(categoryIds);
  await seedMessages();

  const { error } = await supabase.rpc("refresh_item_stats");
  if (error) {
    console.warn(`! item_stats not refreshed: ${error.message}`);
  } else {
    console.log("✓ item_stats refreshed");
  }

  console.log(
    `\nDone. ${CATEGORIES.length} categories, ${TOTAL_ITEMS} items, ${MESSAGES.length} copy lines.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
