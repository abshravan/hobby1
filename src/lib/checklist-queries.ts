import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChecklistCategory, ChecklistItem } from "@/lib/checklist";
import type { ItemStat } from "@/lib/stats";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  items: (ChecklistItem & { sort_order: number })[];
};

type StatRow = {
  item_id: string;
  completed_users: number | string;
  total_users: number | string;
  completion_rate: number | string;
};

export type ChecklistData = {
  categories: ChecklistCategory[];
  completedItemIds: string[];
  /** Keyed by item id. Empty when the stats view has not been built yet. */
  stats: Record<string, ItemStat>;
  error: string | null;
};

/**
 * Loads the whole checklist plus the caller's completed items.
 *
 * The progress query carries no user_id filter on purpose: RLS scopes it to the
 * signed-in user, so there is no filter here to forget or get wrong.
 *
 * Aggregate stats are fetched alongside and are intentionally not user-scoped —
 * they identify nobody. A failure to read them is not fatal: the checklist
 * renders without percentages rather than not at all.
 */
export async function loadChecklist(supabase: SupabaseClient): Promise<ChecklistData> {
  const [
    { data: categoryRows, error: categoryError },
    { data: progressRows, error: progressError },
    { data: statRows },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, tagline, items(id, slug, title, difficulty, sort_order)")
      .eq("items.is_active", true)
      .order("sort_order")
      .returns<CategoryRow[]>(),
    supabase.from("user_item_progress").select("item_id").eq("status", "completed"),
    supabase
      .from("item_stats")
      .select("item_id, completed_users, total_users, completion_rate")
      .returns<StatRow[]>(),
  ]);

  const categories: ChecklistCategory[] = (categoryRows ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    // An embedded select does not inherit the parent's order clause, so the
    // authored item order has to be restored here.
    items: [...row.items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id, slug, title, difficulty }) => ({ id, slug, title, difficulty })),
  }));

  const stats: Record<string, ItemStat> = {};
  for (const row of statRows ?? []) {
    stats[row.item_id] = {
      itemId: row.item_id,
      completedUsers: Number(row.completed_users),
      totalUsers: Number(row.total_users),
      // Postgres numeric arrives as a string over the wire.
      completionRate: Number(row.completion_rate),
    };
  }

  return {
    categories,
    completedItemIds: (progressRows ?? []).map((row) => row.item_id as string),
    stats,
    error: categoryError?.message ?? progressError?.message ?? null,
  };
}

/**
 * Checks or unchecks one item.
 *
 * Unchecking clears the row, but only when it carries no flag the user set
 * deliberately: rows with needs_help or is_private are downgraded to 'saved'
 * instead, so a mis-click can never destroy a flag. (Those toggles arrive in
 * Steps 7 and 11; the guard is here so they land safely.)
 */
export async function applyItemToggle(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  completed: boolean,
): Promise<{ error?: string }> {
  if (completed) {
    const { error } = await supabase.from("user_item_progress").upsert(
      {
        user_id: userId,
        item_id: itemId,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,item_id" },
    );
    return error ? { error: error.message } : {};
  }

  const { error: deleteError } = await supabase
    .from("user_item_progress")
    .delete()
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("needs_help", false)
    .eq("is_private", false);

  if (deleteError) return { error: deleteError.message };

  const { error: downgradeError } = await supabase
    .from("user_item_progress")
    .update({ status: "saved", completed_at: null })
    .eq("user_id", userId)
    .eq("item_id", itemId);

  return downgradeError ? { error: downgradeError.message } : {};
}
