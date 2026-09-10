import { notFound } from "next/navigation";
import { DevLoginPicker } from "@/components/dev-login-picker";
import { DEV_PERSONAS, devLoginEnabled } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dev login" };

export default function DevLoginPage() {
  // Not "forbidden" — a 404 does not confirm the route exists at all.
  if (!devLoginEnabled()) notFound();

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="inline-block rounded-full bg-ember-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-ember-600">
        Development only
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in as a persona</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Real Supabase sessions for seeded test accounts — RLS and every auth check
        behave exactly as they do in production. Run{" "}
        <code className="rounded bg-parchment-200 px-1 py-0.5 text-[13px]">npm run dev:seed</code>{" "}
        first, or these personas sign in with nothing on their list.
      </p>

      <DevLoginPicker personas={DEV_PERSONAS} />
    </main>
  );
}
