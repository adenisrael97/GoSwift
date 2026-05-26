/**
 * Auth API — thin wrappers over the /api/auth/* routes and the Supabase
 * Auth client surface.
 *
 * UI code MUST go through these helpers instead of importing `@/lib/supabase`
 * directly so the auth surface stays consolidated in one place (single
 * client, single token store, predictable session lifecycle).
 *
 * register / login / forgotPassword route through /api/auth/* because the
 * server owns account creation and the phone → email resolution. After
 * register/login the client MUST call setSession() with the returned tokens:
 * that hydrates the browser client, persists the session into the Supabase
 * auth cookies (which the proxy refreshes on every request), and makes
 * AuthContext observe a SIGNED_IN event.
 */
import { supabase, anonymousFetch } from './client';

/**
 * POST /api/auth/register — create an account and sign in.
 * On success the response body contains
 * `{ session: { access_token, refresh_token }, user, role, profileName }`.
 */
export function register({ fullName, email, phone, password }) {
  return anonymousFetch('/api/auth/register', {
    method: 'POST',
    body:   JSON.stringify({ fullName, email, phone, password }),
  });
}

/**
 * POST /api/auth/login — sign in with email-or-phone + password.
 * Same success body shape as register().
 */
export function login({ identifier, password }) {
  return anonymousFetch('/api/auth/login', {
    method: 'POST',
    body:   JSON.stringify({ identifier, password }),
  });
}

/**
 * POST /api/auth/forgot-password — request a recovery email. Always resolves
 * with a uniform success response (no account-existence disclosure).
 */
export function forgotPassword(identifier) {
  return anonymousFetch('/api/auth/forgot-password', {
    method: 'POST',
    body:   JSON.stringify({ identifier }),
  });
}

/**
 * Hydrate the in-memory Supabase client with tokens returned by login/register.
 * Guards against undefined/null input so a partial response body (e.g. from
 * a truncated connection) doesn't throw a destructuring TypeError.
 */
export function setSession(tokens) {
  const access_token  = tokens?.access_token;
  const refresh_token = tokens?.refresh_token;
  if (!access_token || !refresh_token) return Promise.resolve({ data: {}, error: null });
  return supabase.auth.setSession({ access_token, refresh_token });
}

const RECOVERY_LINK_ERROR =
  'This reset link is invalid or has expired. Please request a new one.';

/**
 * Establish a recovery session from a password-reset link. Used by the
 * /reset-password page before the user sets a new password.
 *
 * Supports every link shape Supabase can emit, so the flow works regardless
 * of the email-template / auth-flow configuration:
 *   • token_hash (+ type=recovery) → verifyOtp. Works cross-device (no PKCE
 *     verifier needed). Emitted when the template uses {{ .TokenHash }}.
 *   • code → exchangeCodeForSession. PKCE flow; same browser only.
 *   • access_token + refresh_token → setSession. This is the DEFAULT implicit
 *     flow: the stock {{ .ConfirmationURL }} template makes Supabase 302 to
 *     `/reset-password#access_token=…&refresh_token=…&type=recovery`, putting
 *     the tokens in the URL hash. The client runs with detectSessionInUrl:false,
 *     so without this branch those (very common) links would always read as
 *     expired.
 *
 * @param {{ token_hash?: string, code?: string, access_token?: string, refresh_token?: string }} params
 * @returns {Promise<{ error: string|null }>}
 */
export async function verifyRecoveryLink({ token_hash, code, access_token, refresh_token }) {
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' });
    return { error: error ? RECOVERY_LINK_ERROR : null };
  }
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: error ? RECOVERY_LINK_ERROR : null };
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { error: error ? RECOVERY_LINK_ERROR : null };
  }
  return { error: RECOVERY_LINK_ERROR };
}

/**
 * Set a new password on the recovery session established by
 * verifyRecoveryLink(). Returns the error message on failure.
 *
 * @param {string} newPassword
 * @returns {Promise<{ error: string|null }>}
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

/**
 * Full logout — clears the legacy cookie via /api/auth/logout, then signs out
 * of Supabase. Callers should rely on the SIGNED_OUT event from
 * onAuthStateChange to reset local state.
 *
 * scope: 'local' ends ONLY this device's session. The default ('global')
 * would revoke the refresh token on every device the user is signed in on,
 * logging them out everywhere on their next navigation — the opposite of the
 * per-device "stay logged in" behaviour we want.
 */
export async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
  return supabase.auth.signOut({ scope: 'local' });
}

/** Read the current session synchronously from the client cache. */
export function getSession() {
  return supabase.auth.getSession();
}

/**
 * Subscribe to auth state events. Returns the `{ data: { subscription } }`
 * shape Supabase returns so callers can `subscription.unsubscribe()` on
 * cleanup — keeping the surface identical avoids a behavioural shim.
 */
export function onAuthStateChange(cb) {
  return supabase.auth.onAuthStateChange(cb);
}
