import type { ItemDifficulty } from "@/lib/types";

export type ChecklistItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: ItemDifficulty;
};

export type ChecklistCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  items: ChecklistItem[];
};

export type Progress = { completed: number; total: number; percent: number };

/**
 * Percent as a whole number. Floored, so 127/128 never rounds up to a
 * premature 100 — but clamped to a minimum of 1 once anything is done, because
 * showing "0%" to someone who just checked their first box is a lie that reads
 * as a punishment.
 */
export function toProgress(completed: number, total: number): Progress {
  if (total === 0 || completed === 0) return { completed, total, percent: 0 };
  return {
    completed,
    total,
    percent: Math.max(1, Math.floor((completed / total) * 100)),
  };
}

export function categoryProgress(
  category: ChecklistCategory,
  completedIds: ReadonlySet<string>,
): Progress {
  const completed = category.items.reduce(
    (count, item) => count + (completedIds.has(item.id) ? 1 : 0),
    0,
  );
  return toProgress(completed, category.items.length);
}

export function overallProgress(
  categories: readonly ChecklistCategory[],
  completedIds: ReadonlySet<string>,
): Progress {
  let completed = 0;
  let total = 0;
  for (const category of categories) {
    total += category.items.length;
    for (const item of category.items) {
      if (completedIds.has(item.id)) completed += 1;
    }
  }
  return toProgress(completed, total);
}

/**
 * `moderate` is deliberately absent: it is the unmarked middle, and labelling
 * it put the same pill on nearly every row, which drowned out the two labels
 * that actually carry signal.
 */
export const DIFFICULTY_LABEL: Partial<Record<ItemDifficulty, string>> = {
  quick: "Quick",
  stretch: "Big one",
};
