"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, signInWithGoogle, type AuthFormState } from "@/app/login/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-medium text-parchment transition hover:bg-ink-800 disabled:opacity-60"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: "signin" | "signup";
  next: string;
  initialError?: string;
}) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {
    error: initialError,
  });

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Start your list"}
      </h1>
      <p className="mt-1.5 text-sm text-ink-600">
        {mode === "signin"
          ? "Pick up where you left off."
          : "128 things worth doing. You have probably done more than you think."}
      </p>

      <form action={signInWithGoogle} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-parchment-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-parchment-200"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4">
            <path
              fill="#4285F4"
              d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.9a5.04 5.04 0 0 1-2.19 3.3v2.75h3.54c2.08-1.91 3.27-4.73 3.27-8.06Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.96 0 5.45-.98 7.26-2.66l-3.54-2.75c-.98.66-2.24 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.53H2.2v2.84A11 11 0 0 0 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.85 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.2a11 11 0 0 0 0 9.9l3.65-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.61 0 3.06.55 4.2 1.64l3.14-3.14C17.45 2.1 14.96 1 12 1a11 11 0 0 0-9.8 6.05l3.65 2.84c.87-2.6 3.29-4.51 6.15-4.51Z"
            />
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-parchment-200" />
        or
        <span className="h-px flex-1 bg-parchment-200" />
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-parchment-200 bg-white px-3 py-2 text-sm outline-none focus:border-ember-500"
          />
          {mode === "signup" && (
            <p className="mt-1 text-xs text-ink-400">At least 8 characters.</p>
          )}
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.notice}
          </p>
        )}

        <SubmitButton label={mode === "signin" ? "Sign in" : "Create account"} />
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        {mode === "signin" ? (
          <>
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-ink-950 underline underline-offset-4">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="font-medium text-ink-950 underline underline-offset-4">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
