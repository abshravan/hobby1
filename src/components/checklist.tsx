"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { CategorySection } from "@/components/category-section";
import { ProgressMeter } from "@/components/progress-meter";
import { setItemCompleted } from "@/app/home/actions";
import { overallProgress, type ChecklistCategory } from "@/lib/checklist";
import type { ItemStat } from "@/lib/stats";

type Toggle = { itemId: string; completed: boolean };

export function Checklist({
  categories,
  completedItemIds,
  stats,
}: {
  categories: ChecklistCategory[];
  completedItemIds: string[];
  stats: Record<string, ItemStat>;
}) {
  const serverCompleted = useMemo(() => new Set(completedItemIds), [completedItemIds]);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // The checkbox flips immediately; the server action reconciles behind it.
  const [completedIds, applyToggle] = useOptimistic(
    serverCompleted,
    (current: ReadonlySet<string>, toggle: Toggle) => {
      const next = new Set(current);
      if (toggle.completed) next.add(toggle.itemId);
      else next.delete(toggle.itemId);
      return next;
    },
  );

  const progress = overallProgress(categories, completedIds);

  function handleToggle(itemId: string, completed: boolean) {
    setError(null);
    startTransition(async () => {
      applyToggle({ itemId, completed });
      const result = await setItemCompleted(itemId, completed);
      // On failure the optimistic value is discarded when the transition ends,
      // so the checkbox snaps back to the truth on its own.
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-6 border-b border-ink-800 bg-ink-950 px-6 py-3 text-parchment">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <ProgressMeter progress={progress} tone="inverted" />
          </div>
          <p className="shrink-0 text-sm tabular-nums">
            <span className="font-semibold">{progress.completed}</span>
            <span className="text-parchment/60"> / {progress.total}</span>
            <span className="ml-2 text-parchment/60">{progress.percent}%</span>
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            completedIds={completedIds}
            stats={stats}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-md rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg"
        >
          Could not save that: {error}
        </p>
      )}
    </>
  );
}
