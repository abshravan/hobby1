"use client";

import { DIFFICULTY_LABEL, type ChecklistItem } from "@/lib/checklist";

const DIFFICULTY_STYLE: Partial<Record<ChecklistItem["difficulty"], string>> = {
  quick: "bg-emerald-50 text-emerald-800",
  stretch: "bg-ember-500/10 text-ember-600",
};

export function ChecklistItemRow({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const label = DIFFICULTY_LABEL[item.difficulty];

  return (
    <li>
      <label
        className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-parchment-200/60 ${
          checked ? "bg-parchment-200/30" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          className="peer sr-only"
        />
        {/* The box is drawn here rather than on the input so the tick can be a
            real SVG — a background-image tick renders inconsistently at 2x. */}
        <span
          aria-hidden
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-ink-400 bg-white text-transparent transition peer-checked:border-ember-500 peer-checked:bg-ember-500 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember-500"
        >
          <svg viewBox="0 0 16 16" className="size-3">
            <path
              d="M3 8.5 6.5 12 13 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span
          className={`min-w-0 flex-1 text-[15px] leading-snug transition-colors ${
            checked ? "text-ink-600 line-through decoration-ink-400" : "text-ink-950"
          }`}
        >
          {item.title}
        </span>

        {label && (
          <span
            className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              DIFFICULTY_STYLE[item.difficulty]
            } ${checked ? "opacity-45" : ""}`}
          >
            {label}
          </span>
        )}
      </label>
    </li>
  );
}
