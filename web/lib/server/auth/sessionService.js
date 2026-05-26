// ─── Session Service ──────────────────────────────────────────────────────────
//
// Server-side auth operations for email/phone + password authentication.
// Supabase Auth owns identity and password hashing (bcrypt); this module
// is the thin server boundary the /api/auth/* routes call into.
//
// Responsibilities:
//   1. registerAccount()          — create auth user + profiles row
//   2. signInWithPassword()       — verify credentials, mint a session
//   3. resolveEmailFromIdentifier — map an email-or-phone login to an email
//   4. requestPasswordReset()     — send the recovery email
//   5. linkDriverAndReadRole()    — promote approved drivers + read role
//
// The session itself is owned by Supabase Auth and stored in cookies by the
// browser client (lib/supabase.js); proxy.js refreshes those cookies on every
// request. This module never persists a session of its own.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

import { getAdminSupabase } from "@/lib/server/supabase.admin";
import { classifyIdentifier } from "@/lib/utils/validation";

// Anon client — used for the public auth surface (password sign-in and the
// recovery-email request). A fresh client per call keeps each request's
// session isolated; we never persist a session on the server.
function makeAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Creates a new account: an auth.users row (email + bcrypt password) plus a
 * matching public.profiles row carrying the phone (delivery contact + cookie
 * key) and email.
 *
 * Email confirmation is bypassed (email_confirm: true) so users are usable
 * immediately — matches the project's "Confirm email → OFF" stance. Phone is
 * stored only in profiles + user_metadata, NOT on auth.users, so the flow does
 * not depend on a Supabase phone provider being configured.
 *
 * @param {{ fullName: string, email: string, phone: string, password: string }} input
 * @returns {Promise<{ userId: string|null, error: string|null, code: 'conflict'|'server'|null }>}
 */
export async function registerAccount({ fullName, email, phone, password }) {
  const admin = getAdminSupabase();

  // Phone pre-check (parameterised .eq — never string-interpolated into a
  // filter). createUser enforces email uniqueness at the auth.users level,
  // so we only pre-check phone here to return a clean "phone exists" 409
  // without first creating an orphan auth user. The profiles unique
  // constraints are still the source of truth and are enforced on insert
  // below as the race-condition safety net.
  let existingPhone;
  try {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (error) throw error;
    existingPhone = data;
  } catch (err) {
    console.error("[sessionService.registerAccount] phone pre-check failed:", err?.message);
    return { userId: null, error: "Could not create account. Please try again.", code: "server" };
  }
  if (existingPhone) {
    return { userId: null, error: "An account with this phone number already exists.", code: "conflict" };
  }

  // Create the auth user.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (createError) {
    const msg = createError.message ?? "";
    if (createError.code === "email_exists" || /already.*registered|already.*exists/i.test(msg)) {
      return { userId: null, error: "An account with this email already exists.", code: "conflict" };
    }
    console.error("[sessionService.registerAccount] createUser failed:", msg);
    return { userId: null, error: "Could not create account. Please try again.", code: "server" };
  }

  const userId = created?.user?.id;
  if (!userId) {
    return { userId: null, error: "Could not create account. Please try again.", code: "server" };
  }

  // Insert the profile row. role falls to the column DEFAULT ('customer').
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, email, phone, full_name: fullName });

  if (profileError) {
    // Roll back the auth user so a half-created account can't block a retry
    // and no orphan auth.users row is left behind. unique_violation (23505)
    // means phone or email was taken in the race window since the pre-check.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    if (profileError.code === "23505") {
      const which = /email/i.test(profileError.message ?? "") ? "email" : "phone";
      return { userId: null, error: `An account with this ${which} already exists.`, code: "conflict" };
    }
    console.error("[sessionService.registerAccount] profile insert failed:", profileError.message);
    return { userId: null, error: "Could not create account. Please try again.", code: "server" };
  }

  return { userId, error: null, code: null };
}

// ─── Sign In ────────────────────────────────────────────────────────────────────

/**
 * Verifies email + password and returns a Supabase session.
 *
 * `code` distinguishes failure modes so the route can respond correctly:
 *   • null         — success
 *   • 'invalid'    — wrong credentials (→ 401)
 *   • 'ratelimited'— Supabase throttled the attempt (→ 429). Surfaced
 *                    separately so a throttled user isn't told their password
 *                    is wrong and prompted to reset it needlessly.
 *   • 'network'    — could not reach Supabase (→ 503), e.g. a DNS/connection
 *                    failure. Surfaced separately so users aren't told their
 *                    password is wrong during an outage.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ session: object|null, user: object|null, code: 'invalid'|'ratelimited'|'network'|null }>}
 */
export async function signInWithPassword(email, password) {
  const supabase = makeAnonClient();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      if (error?.status === 429) {
        return { session: null, user: null, code: "ratelimited" };
      }
      return { session: null, user: null, code: "invalid" };
    }
    return { session: data.session, user: data.user, code: null };
  } catch (err) {
    console.error("[sessionService.signInWithPassword] network error:", err?.message);
    return { session: null, user: null, code: "network" };
  }
}

// ─── Identifier → Email ─────────────────────────────────────────────────────────

/**
 * Resolves a login identifier (email OR E.164 phone) to the account email.
 * Email identifiers pass through; phone identifiers are looked up in profiles.
 *
 * Returns null when the identifier is malformed or no account matches — the
 * caller surfaces a generic credential error in either case.
 *
 * @param {string} identifier
 * @returns {Promise<string|null>}
 */
export async function resolveEmailFromIdentifier(identifier) {
  const classified = classifyIdentifier(identifier);
  if (classified.type === "email") return classified.email;
  if (classified.type !== "phone") return null;

  try {
    const { data, error } = await getAdminSupabase()
      .from("profiles")
      .select("email")
      .eq("phone", classified.phone)
      .maybeSingle();

    if (error) {
      console.error("[sessionService.resolveEmailFromIdentifier]", error.message);
      return null;
    }
    return data?.email ?? null;
  } catch (err) {
    console.error("[sessionService.resolveEmailFromIdentifier] network error:", err?.message);
    return null;
  }
}

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * Sends a password-recovery email. The link lands on `redirectTo`, which must
 * be listed in Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * @param {string} email
 * @param {string} redirectTo
 * @returns {Promise<{ error: string|null }>}
 */
export async function requestPasswordReset(email, redirectTo) {
  const supabase = makeAnonClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    console.error("[sessionService.requestPasswordReset]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Driver linking + role read ─────────────────────────────────────────────────

/**
 * If an approved-but-unlinked driver application exists for this phone, link
 * it (promotes profiles.role → 'driver', creates driver_profiles +
 * driver_earnings). Then read the authoritative role + name from profiles.
 *
 * Non-fatal throughout: a failure must never block the auth response. Runs on
 * every login so an approval that lands after signup is picked up next sign-in.
 *
 * @param {string} userId
 * @param {string} phone
 * @returns {Promise<{ role: 'customer'|'driver'|'admin', profileName: string }>}
 */
export async function linkDriverAndReadRole(userId, phone) {
  const admin = getAdminSupabase();

  try {
    await admin.rpc("link_approved_driver", { p_phone: phone, p_user_id: userId });
  } catch {
    // no approved unlinked application — normal for regular users
  }

  let role = "customer";
  let profileName = "";
  try {
    const { data } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .single();
    if (data?.role === "admin" || data?.role === "driver") role = data.role;
    profileName = data?.full_name ?? "";
  } catch {
    // non-fatal — default to customer
  }

  return { role, profileName };
}
