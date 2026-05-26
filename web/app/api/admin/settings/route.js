import { requireAdmin }     from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError } from '@/lib/api/response';
import { validateBody }    from '@/lib/api/validate';
import { UpdateAdminSettingsSchema } from '@/lib/api/schemas/admin';
import { withLogger } from '@/lib/api/withLogger';

/**
 * GET  /api/admin/settings  — load platform settings
 * PATCH /api/admin/settings  — save platform settings
 */

export const GET = withLogger('admin.settings.get', async (request) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { data, error } = await getAdminSupabase()
    .from('admin_settings')
    .select('settings')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('[GET /api/admin/settings]', error.message);
    return serverError('Failed to load settings');
  }

  return ok({ settings: data?.settings ?? {} });
});

export const PATCH = withLogger('admin.settings.update', async (request) => {
  const { user, errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  // admin_settings.settings is JSONB NOT NULL — schema enforces plain
  // object so a malformed body cannot reach the DB silently.
  const { data: body, errorResponse: validationErr } =
    await validateBody(request, UpdateAdminSettingsSchema);
  if (validationErr) return validationErr;

  const { error } = await getAdminSupabase()
    .from('admin_settings')
    .update({
      settings:   body,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', 1);

  if (error) {
    console.error('[PATCH /api/admin/settings]', error.message);
    return serverError('Failed to save settings');
  }

  return ok({ saved: true });
});
