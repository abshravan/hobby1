import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { devLoginEnabled } from "@/lib/dev-auth";

/** Routes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/home", "/settings"];

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated visitors away from protected routes.
 */
export async function updateSession(request: NextRequest) {
  // Third guard on the dev login (after the page and the action). Anything
  // under /dev simply does not exist unless it is explicitly switched on.
  if (request.nextUrl.pathname.startsWith("/dev") && !devLoginEnabled()) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() (not getSession()) — it revalidates the token with Supabase
  // rather than trusting a cookie the client could have forged.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
