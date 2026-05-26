/**
 * Internal helpers for the web API layer.
 *
 * Imported only by ./auth.js, ./profile.js, ./orders.js, ./drivers.js,
 * ./admin.js — UI code should import from '@/lib/api' (the barrel) so
 * the surface stays consolidated in one place.
 *
 * Two patterns wrap every backend call this app makes:
 *   1. Direct Supabase client access for RLS-scoped reads, realtime
 *      channels, and the Supabase Auth surface.
 *   2. authedFetch() for /api/* routes that need a Bearer token taken
 *      from the current Supabase session.
 *
 * The raw `supabase` client is re-exported through ./index.js for the
 * few privileged callers (AuthProvider, realtime hooks). Treat that as
 * a deliberate surface — not a back-door for new ad-hoc table reads.
 */
import { supabase } from '@/lib/supabase';

export { supabase };

/**
 * Make an authenticated request against this app's /api/* routes.
 *
 * Returns `{ ok, status, body }` so callers branch on `!ok` and surface
 * `body.error` without juggling fetch + json parsing themselves. Network
 * failures and missing sessions collapse into `ok: false` with a populated
 * `body.error`.
 */
export async function authedFetch(path, init = {}) {
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session ?? null;
  } catch {
    return { ok: false, status: 0, body: { error: 'Could not read session.' } };
  }
  if (!session?.access_token) {
    return { ok: false, status: 401, body: { error: 'Sign-in required' } };
  }

  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${session.access_token}`,
        ...(init.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: 'Network error' } };
  }
}

/**
 * Same envelope, but does not require a session. Used by the public
 * /api/auth/register, /api/auth/login, and /api/auth/forgot-password
 * routes that establish a session in the first place, and /api/driver/apply
 * which accepts unauthenticated submissions.
 */
export async function anonymousFetch(path, init = {}) {
  // Attach the bearer opportunistically — /api/driver/apply uses it to
  // link the application to an existing customer account if one is
  // already signed in.
  let auth;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) auth = `Bearer ${token}`;
  } catch {
    // ignore — anonymous path
  }

  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: 'Network error' } };
  }
}
