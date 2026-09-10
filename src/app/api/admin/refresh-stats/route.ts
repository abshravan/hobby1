import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Rebuilds the item_stats materialized view.
 *
 * The primary schedule is pg_cron inside Postgres (see migration 0003). This
 * route exists for projects where pg_cron is unavailable, and for forcing a
 * refresh by hand. It runs with the service role, so it is gated on a shared
 * secret rather than a user session.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically once
 * CRON_SECRET is set on the project, so this works as a cron target unchanged.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Without a configured secret the endpoint stays shut rather than open.
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    // Missing SUPABASE_SERVICE_ROLE_KEY. Report it as a configuration problem
    // rather than letting the env error surface as an unhandled 500.
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const { error } = await supabase.rpc("refresh_item_stats");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ refreshed: true, durationMs: Date.now() - startedAt });
}

/** Constant-time compare, so a wrong secret leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
