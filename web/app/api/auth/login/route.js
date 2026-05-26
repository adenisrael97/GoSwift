import { NextResponse } from "next/server";

import {
  resolveEmailFromIdentifier,
  signInWithPassword,
  linkDriverAndReadRole,
} from "@/lib/server/auth/sessionService";
import { getAdminSupabase }  from "@/lib/server/supabase.admin";
import { validateBody }      from "@/lib/api/validate";
import { LoginSchema }       from "@/lib/api/schemas/auth";
import { withLogger }        from "@/lib/api/withLogger";

// One generic message for every credential failure so the response never
// reveals whether an email/phone is registered.
const INVALID_CREDENTIALS = "Invalid email/phone or password.";

/**
 * POST /api/auth/login
 *
 * Accepts a single identifier (email OR E.164 phone) + password. Phone
 * identifiers are resolved to the account email server-side, then verified
 * with Supabase. On success, returns the session tokens; the client hydrates
 * the browser client with setSession(), which persists the session into the
 * Supabase auth cookies that proxy.js refreshes on every request.
 */
export const POST = withLogger("auth.login.create", async (request) => {
  const { data, errorResponse } = await validateBody(request, LoginSchema);
  if (errorResponse) return errorResponse;

  const { identifier, password } = data;

  const email = await resolveEmailFromIdentifier(identifier);
  if (!email) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const { session, user, code } = await signInWithPassword(email, password);
  if (code === "ratelimited") {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait a moment and try again." },
      { status: 429 },
    );
  }
  if (code === "network") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
  if (code || !session || !user) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  // The cookie keys off phone. It's stamped into user_metadata at
  // registration (never mutated after), so use that to avoid an extra
  // round-trip; fall back to the authoritative profiles row if absent
  // (e.g. accounts created out-of-band).
  let phone = user.user_metadata?.phone;
  if (!phone) {
    const { data: profile } = await getAdminSupabase()
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();
    phone = profile?.phone;
  }
  if (!phone) {
    // Should never happen (phone is NOT NULL) — fail safe rather than issue a
    // cookie the proxy can't key.
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const { role, profileName } = await linkDriverAndReadRole(user.id, phone);

  return NextResponse.json({
    success: true,
    role,
    profileName,
    user:    { id: user.id, phone, email },
    session: {
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
    },
  });
});
