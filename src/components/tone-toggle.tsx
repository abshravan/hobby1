"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { setTonePreference, type SettingsState } from "@/app/settings/actions";
import type { TonePreference } from "@/lib/types";

const OPTIONS: { value: TonePreference; label: string; blurb: string }[] = [
  {
    value: "motivate",
    label: "Motivate me",
    blurb: "Encouragement, and a small next step. Never a joke at your expense.",
  },
  {
    value: "roast",
    label: "Roast me",
    blurb:
      "Affectionate mockery of your procrastination — always paired with something concrete to do about it.",
  },
];

export function ToneToggle({ current }: { current: TonePreference }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(setTonePreference, {});
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(current);

  // The form data is built explicitly rather than read back off the DOM: a
  // radio's checked state during its own change event is not a reliable source
  // once React is controlling it.
  function choose(tone: TonePreference) {
    if (tone === selected) return;
    const formData = new FormData();
    formData.set("tone", tone);
    startTransition(() => {
      setSelected(tone);
      formAction(formData);
    });
  }

  return (
    <div>
      <h2 id="tone-label" className="text-sm font-medium">
        How should Artha talk to you?
      </h2>

      <div role="radiogroup" aria-labelledby="tone-label" className="mt-3 space-y-2">
        {OPTIONS.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(option.value)}
              className={`flex w-full gap-3 rounded-xl border bg-white p-4 text-left transition ${
                active ? "border-ink-950" : "border-parchment-200 hover:border-ink-400"
              }`}
            >
              <span
                aria-hidden
                className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border transition ${
                  active ? "border-ember-500" : "border-ink-400"
                }`}
              >
                <span
                  className={`size-2 rounded-full transition ${
                    active ? "bg-ember-500" : "bg-transparent"
                  }`}
                />
              </span>
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="mt-0.5 block text-sm text-ink-600">{option.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-ink-400">
        Roast mode still steps back on its own: anything you mark “I want help with this”,
        a broken streak, or a long gap always gets the kind version.
      </p>

      {state.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          Saved.
        </p>
      )}
    </div>
  );
}
