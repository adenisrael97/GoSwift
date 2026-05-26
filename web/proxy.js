// ─── Route Proxy (Next.js 16) ──────────────────────────────────────────────────
//
// Runs on the server before any matched page renders. Two jobs:
//
//   1. Refresh the Supabase auth session and RE-ISSUE its cookies on every
//      request (via the getAll/setAll cookie adapter + getClaims()). Because
//      the cookies are written here server-side (Set-Cookie), the session
//      survives page reloads and — critically — the installed PWA case on
//      iOS, where client-written storage is purged after ~7 days of non-use.
//      This is the sliding-window refresh that keeps active users logged in.
//
//   2. Gate protected routes: if there's no valid session, redirect to /login
//      carrying ?next=<path> so the post-login redirect lands them back.
//
// Security model (layered):
//   Layer 1 — this proxy:        valid Supabase session cookie required
//   Layer 2 — Server Components:  createSSRClient() → getUser/role (authoritative)
//   Layer 3 — API routes:         requireAuth verifies the Supabase JWT (mutations)
//
// IMPORTANT: do not insert code between createServerClient() and getClaims().
// getClaims() is what refreshes the session; reordering or removing it can
// log users out at random. See the @supabase/ssr docs.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const LOGIN_PATH = '/login';

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror onto the request (so downstream sees the fresh values) and
          // onto a new response (so the browser receives the Set-Cookie).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session and triggers the cookie re-issue above when needed.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // IMPORTANT: return supabaseResponse unchanged so any refreshed auth cookies
  // reach the browser. Creating a different response here without copying these
  // cookies over would desync client/server and prematurely end the session.
  return supabaseResponse;
}

// Gate only the authenticated areas. Public/static routes are untouched.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/driver/:path*',
    '/profile/:path*',
  ],
};
