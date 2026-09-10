import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail: string };

/**
 * Step 1 proof-of-wiring: confirms env vars are present and that the app can
 * actually reach the Supabase project. Distinguishes "cannot connect" from
 * "connected, but the schema has not been migrated yet" so the same endpoint
 * stays useful before and after Step 3.
 */
export async function GET() {
  const checks: Check[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  checks.push({
    name: "env:NEXT_PUBLIC_SUPABASE_URL",
    ok: Boolean(url),
    detail: url ? `set (${new URL(url).host})` : "missing",
  });
  checks.push({
    name: "env:NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ok: Boolean(anonKey),
    detail: anonKey ? "set" : "missing",
  });
  checks.push({
    name: "env:SUPABASE_SERVICE_ROLE_KEY",
    ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    detail: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "set (server-only)"
      : "missing — seeding will fail",
  });

  if (url && anonKey) {
    const supabase = await createClient();

    // The auth endpoint answers even with no schema — a pure connectivity probe.
    const { error: authError } = await supabase.auth.getUser();
    const authReachable = !authError || authError.name === "AuthSessionMissingError";
    checks.push({
      name: "supabase:auth",
      ok: authReachable,
      detail: authReachable ? "reachable" : (authError?.message ?? "unreachable"),
    });

    const { error: dbError, count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true });

    if (!dbError) {
      checks.push({
        name: "supabase:db",
        ok: true,
        detail: `categories table readable (${count ?? 0} rows)`,
      });
    } else if (dbError.code === "42P01" || dbError.message.includes("does not exist")) {
      checks.push({
        name: "supabase:db",
        ok: true,
        detail: "connected, schema not migrated yet (run the Step 3 migration)",
      });
    } else {
      checks.push({ name: "supabase:db", ok: false, detail: dbError.message });
    }
  }

  const ok = checks.every((check) => check.ok);
  return NextResponse.json({ app: "artha", ok, checks }, { status: ok ? 200 : 503 });
}
