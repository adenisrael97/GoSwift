import { NextResponse } from "next/server";
import { withLogger } from '@/lib/api/withLogger';

const SESSION_COOKIE = "auth_session";

/**
 * POST /api/auth/logout
 *
 * Clears the middleware-side HttpOnly cookie. The user's Supabase auth
 * session lives in browser storage and is invalidated by the client
 * (AuthContext.logout → supabase.auth.signOut()). Creating a fresh
 * server-side anon client and calling signOut on it does nothing
 * useful — that client has no session attached — so we no longer do it.
 */
export const POST = withLogger('auth.logout.create', async () => {
  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });

  return response;
});
