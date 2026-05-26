import { requireDriver }                from '@/lib/server/driverGuard';
import { ok, badRequest, serverError }  from '@/lib/api/response';
import { validateBody }                 from '@/lib/api/validate';
import { UpdateDriverStatusSchema }     from '@/lib/api/schemas/drivers';
import { withLogger }                   from '@/lib/api/withLogger';

/**
 * PATCH /api/driver/status
 *
 * Toggles the driver's online/offline flag.
 *
 * GPS is NOT a gate here. A driver can go online without a location fix.
 * The dispatch system uses location_updated_at to rank drivers — those
 * with a fresh GPS fix get higher priority, but drivers without one are
 * still eligible as a fallback. Blocking the toggle on GPS would break
 * drivers on low-end Android devices or in poor signal areas.
 *
 * Going OFFLINE is always unconditional.
 */
export const PATCH = withLogger('driver.status.update', async (request) => {
  const { user, supabase, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { data: body, errorResponse: validationErr } =
    await validateBody(request, UpdateDriverStatusSchema);
  if (validationErr) return validationErr;

  const { error } = await supabase
    .from('driver_profiles')
    .update({ is_online: body.isOnline })
    .eq('id', user.id);

  if (error) {
    console.error('[PATCH /api/driver/status]', error.message);
    return serverError('Failed to update status');
  }

  return ok({ isOnline: body.isOnline });
});
