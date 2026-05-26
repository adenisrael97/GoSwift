/**
 * /api/profile
 *
 * PATCH — updates the authenticated user's profile fields.
 *
 * Currently supports: full_name
 *
 * Uses the admin client (service role) so the write succeeds regardless
 * of whether the client's JWT is fully hydrated — critical for the
 * post-OTP welcome sheet flow where the session is brand-new.
 */

import { requireAuth }   from '@/lib/server/supabase.server';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError } from '@/lib/api/response';
import { validateBody }    from '@/lib/api/validate';
import { UpdateProfileSchema } from '@/lib/api/schemas/profile';
import { withLogger } from '@/lib/api/withLogger';

export const PATCH = withLogger('profile.update', async (request) => {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { data, errorResponse: validationErr } =
    await validateBody(request, UpdateProfileSchema);
  if (validationErr) return validationErr;

  /** @type {Record<string, any>} */
  const updates = { updated_at: new Date().toISOString() };
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.email     !== undefined) updates.email     = data.email || null;
  if (data.settings  !== undefined) updates.settings  = data.settings;

  const { data: profile, error } = await getAdminSupabase()
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, full_name, phone, email, role')
    .single();

  if (error) {
    console.error('[PATCH /api/profile]', error.message);
    return serverError('Failed to update profile');
  }

  return ok({ profile });
});

/**
 * DELETE — permanently deletes the authenticated user's account.
 *
 * Uses auth.admin.deleteUser() (service-role) to remove the row from
 * auth.users; the profiles / orders FKs are configured ON DELETE CASCADE
 * (migration 001), so dependent rows are cleaned up automatically.
 */
export const DELETE = withLogger('profile.delete', async (request) => {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { error } = await getAdminSupabase().auth.admin.deleteUser(user.id);

  if (error) {
    console.error('[DELETE /api/profile]', error.message);
    return serverError('Failed to delete account');
  }

  return ok({ success: true });
});
