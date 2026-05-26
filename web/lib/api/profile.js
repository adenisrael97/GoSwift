/**
 * Profile API — reads via Supabase (scoped by RLS to the current user),
 * mutations via the /api/profile routes so server-side validation runs
 * once for both the web and mobile clients.
 */
import { supabase, authedFetch } from './client';

/** Profile row used by AuthContext on hydration. */
export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name, phone, email, created_at')
    .eq('id', userId)
    .single();
  return { data: data ?? null, error: error ?? null };
}

/** Settings screen variant — fetches the JSONB `settings` column too. */
export async function getMyProfileSettings(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('email, phone, settings')
    .eq('id', userId)
    .single();
  return data ?? null;
}

/** PATCH /api/profile — partial update; server validates and writes. */
export function updateProfile(payload) {
  return authedFetch('/api/profile', {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  });
}

/** DELETE /api/profile — account deletion is server-side under service role. */
export function deleteAccount() {
  return authedFetch('/api/profile', { method: 'DELETE' });
}
