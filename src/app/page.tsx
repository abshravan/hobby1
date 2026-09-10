import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-ember-600">Artha</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        A checklist for the life you actually want to have lived.
      </h1>
      <p className="mt-4 text-lg text-ink-600">
        128 experiences across eight kinds of person you might be becoming. Check off what
        you have done, see how rare it is, and get told about the rest — kindly or
        mercilessly, your choice.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {user ? (
          <Link
            href="/home"
            className="rounded-lg bg-ink-950 px-5 py-2.5 text-sm font-medium text-parchment transition hover:bg-ink-800"
          >
            Go to your list
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-lg bg-ink-950 px-5 py-2.5 text-sm font-medium text-parchment transition hover:bg-ink-800"
            >
              Start your list
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-parchment-200 bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-parchment-200"
            >
              Sign in
            </Link>
          </>
        )}
      </div>

      <div className="mt-14 flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-400">
        {["Adventurer", "Creator", "Connector", "Learner", "Explorer", "Caretaker", "Provider", "Rebel"].map(
          (name, index) => (
            <span key={name}>
              {name}
              {index < 7 && <span className="ml-2 text-ink-400/50">·</span>}
            </span>
          ),
        )}
      </div>
    </main>
  );
}
