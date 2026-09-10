import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + magic-link landing point. Supabase redirects here with a `code`,
 * which we exchange for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Only allow same-site relative redirects — an attacker-supplied absolute
  // URL here would turn the callback into an open redirect.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  if (!code) {
    const description = searchParams.get("error_description") ?? "Missing authorization code.";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(description)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
