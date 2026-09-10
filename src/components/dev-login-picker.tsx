"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAsPersona, type DevLoginState } from "@/app/dev/login/actions";
import type { DevPersona } from "@/lib/dev-auth";

function PersonaButton({ persona }: { persona: DevPersona }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="persona"
      value={persona.key}
      disabled={pending}
      className="w-full rounded-xl border border-parchment-200 bg-white p-4 text-left transition hover:border-ink-400 disabled:opacity-50"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{persona.name}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            persona.tone === "roast"
              ? "bg-ember-500/10 text-ember-600"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {persona.tone}
        </span>
      </span>
      <span className="mt-1 block text-sm text-ink-600">{persona.purpose}</span>
    </button>
  );
}

export function DevLoginPicker({ personas }: { personas: DevPersona[] }) {
  const [state, formAction] = useActionState<DevLoginState, FormData>(signInAsPersona, {});

  return (
    <form action={formAction} className="mt-7 space-y-2.5">
      {personas.map((persona) => (
        <PersonaButton key={persona.key} persona={persona} />
      ))}

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
    </form>
  );
}
