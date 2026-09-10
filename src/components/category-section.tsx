"use client";

import { useId, useState } from "react";
import { ChecklistItemRow } from "@/components/checklist-item-row";
import { ProgressMeter } from "@/components/progress-meter";
import { categoryProgress, type ChecklistCategory } from "@/lib/checklist";
import type { ItemStat } from "@/lib/stats";

export function CategorySection({
  category,
  completedIds,
  stats,
  onToggle,
}: {
  category: ChecklistCategory;
  completedIds: ReadonlySet<string>;
  stats: Record<string, ItemStat>;
  onToggle: (itemId: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const progress = categoryProgress(category, completedIds);
  const complete = progress.total > 0 && progress.completed === progress.total;

  return (
    <section className="overflow-hidden rounded-xl border border-parchment-200 bg-white">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-parchment-200/50"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight">{category.name}</span>
              {complete && (
                <span className="rounded-full bg-ember-500/10 px-2 py-0.5 text-[11px] font-medium text-ember-600">
                  Complete
                </span>
              )}
            </span>
            {category.tagline && (
              <span className="mt-0.5 block text-sm text-ink-600">{category.tagline}</span>
            )}
            <span className="mt-2.5 flex items-center gap-3">
              <ProgressMeter progress={progress} className="max-w-[220px]" />
              <span className="shrink-0 text-xs tabular-nums text-ink-600">
                {progress.completed}/{progress.total}
              </span>
            </span>
          </span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={`size-5 shrink-0 text-ink-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </h2>

      <div id={panelId} hidden={!open}>
        <ul className="divide-y divide-parchment-200 border-t border-parchment-200">
          {category.items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              checked={completedIds.has(item.id)}
              stat={stats[item.id]}
              onToggle={(checked) => onToggle(item.id, checked)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
