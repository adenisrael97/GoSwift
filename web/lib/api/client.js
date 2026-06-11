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
// Hard ceiling on how long any /api/* call may run before we give up. A
// request that never settles (a stalled connection, a wedged service worker
// in an installed PWA, a flaky mobile network) would otherwise leave the UI
// spinning forever. AbortController turns that into a clean, retryable error.
const REQUEST_TIMEOUT_MS = 20000;

/**
 * fetch() with a timeout. Aborts after `timeoutMs` so a stuck request rejects
 * (caught by the callers below) instead of hanging indefinitely.
 */
async function fetchWithTimeout(path, init, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Map a thrown fetch error to the standard envelope, distinguishing timeouts. */
function networkErrorEnvelope(err) {
  const timedOut = err?.name === 'AbortError';
  return {
    ok: false,
    status: 0,
    body: {
      error: timedOut
        ? 'The request timed out. Please check your connection and try again.'
        : 'Network error',
    },
  };
}

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
    const res = await fetchWithTimeout(path, {
      ...init,
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${session.access_token}`,
        ...(init.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return networkErrorEnvelope(err);
  }
}

/**
 * Authenticated multipart upload — same `{ ok, status, body }` envelope as
 * authedFetch, but sends a FormData body. Crucially it does NOT set a
 * Content-Type header: the browser must add `multipart/form-data` with the
 * correct boundary itself, which it only does when Content-Type is absent.
 */
export async function authedUpload(path, formData) {
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
    const res = await fetchWithTimeout(path, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body:    formData,
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return networkErrorEnvelope(err);
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
    const res = await fetchWithTimeout(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return networkErrorEnvelope(err);
  }
}
