/**
 * Resolve the current user from the Supabase session cookie.
 *
 * Used by Server Components and server-only helpers that need to know who the
 * caller is. The Supabase session now lives in cookies (see lib/supabase.js +
 * proxy.js), so we verify it with the SSR client's getClaims() and then read
 * the authoritative role/name/phone from the profiles row by user id.
 *
 * Returns null when:
 *   • no valid session cookie is present
 *   • no profile row matches the user id
 *
 * Callers should redirect (or render an unauth state) on null — Server
 * Components can call `redirect('/login')` directly from here.
 *
 * Result is memoized per request via React's `cache()` so multiple
 * Server Components on the same page only trigger one lookup.
 */
import 'server-only';

import { cache } from 'react';

import { createSSRClient }  from '@/lib/server/supabase.ssr';
import { getAdminSupabase } from '@/lib/server/supabase.admin';

/**
 * @typedef {object} AuthFromCookie
 * @property {string} userId
 * @property {'customer'|'driver'|'admin'} role
 * @property {string | null} phone
 * @property {string | null} fullName
 * @property {string | null} email
 */

/** @returns {Promise<AuthFromCookie | null>} */
async function _getAuthFromCookie() {
  const supabase = await createSSRClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  // Authoritative read (bypasses RLS) of the fields RSC pages need.
  const { data, error } = await getAdminSupabase()
    .from('profiles')
    .select('id, role, full_name, email, phone')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    userId:   data.id,
    role:     data.role,
    phone:    data.phone     ?? null,
    fullName: data.full_name ?? null,
    email:    data.email     ?? null,
  };
}

export const getAuthFromCookie = cache(_getAuthFromCookie);

/**
 * Throws redirect to /login when no session — convenience for the
 * common Server Component entry: `const auth = await requireAuthRSC();`
 *
 * `redirect()` from next/navigation throws internally, so we never
 * return null when the guard fails; the type is non-nullable to make
 * downstream destructuring safe.
 *
 * @param {{ allowedRoles?: Array<'customer'|'driver'|'admin'> }} [opts]
 * @returns {Promise<AuthFromCookie>}
 */
export async function requireAuthRSC({ allowedRoles } = {}) {
  const { redirect } = await import('next/navigation');
  const auth = await getAuthFromCookie();
  if (!auth) redirect('/login');

  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    // Wrong role for this route — bounce them to their own home.
    if (auth.role === 'admin')  redirect('/admin/dashboard');
    if (auth.role === 'driver') redirect('/driver/dashboard');
    redirect('/dashboard');
  }

  return auth;
}
