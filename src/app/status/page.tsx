import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Health = {
  ok: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
};

/** Human-readable view of /api/health — the Step 1 "is the stack wired?" page. */
export default async function StatusPage() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  let health: Health | null = null;
  let fetchError: string | null = null;

  try {
    const response = await fetch(`${protocol}://${host}/api/health`, { cache: "no-store" });
    health = (await response.json()) as Health;
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-ink-600 hover:text-ink-950">
        ← Artha
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Stack status</h1>

      {fetchError ? (
        <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">{fetchError}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-600">
            {health?.ok
              ? "Everything is wired up."
              : "Something is not wired up yet — details below."}
          </p>
          <ul className="mt-6 divide-y divide-parchment-200 rounded-xl border border-parchment-200 bg-white">
            {health?.checks.map((check) => (
              <li key={check.name} className="flex items-start gap-3 px-4 py-3">
                <span aria-hidden className={check.ok ? "text-emerald-600" : "text-red-600"}>
                  {check.ok ? "✓" : "✕"}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-sm">{check.name}</p>
                  <p className="text-sm text-ink-600">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
