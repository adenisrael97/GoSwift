import { NextResponse } from 'next/server';

import { requireDriver }     from '@/lib/server/driverGuard';
import { ok, serverError }   from '@/lib/api/response';
import { validateBody }      from '@/lib/api/validate';
import { UpdateLocationSchema } from '@/lib/api/schemas/drivers';
import { withLogger } from '@/lib/api/withLogger';

/**
 * PATCH /api/driver/location
 *
 * Driver app posts the current GPS fix here every ~10–15 seconds
 * while the app is open. The dispatch RPC filters drivers by
 * location_updated_at > now() - 5min — stale drivers don't
 * receive offers.
 *
 * Server-side throttle (Sprint 1 / item #3):
 *   The mobile hook self-throttles to one PATCH per 10s, but that's
 *   a guideline — a misbehaving client (remount, retry storm, bad
 *   actor) can hammer this endpoint. At 5K concurrent drivers a
 *   single misbehaving fleet can melt Postgres. We enforce a hard
 *   server floor of MIN_WRITE_INTERVAL_MS by guarding the UPDATE
 *   with a `location_updated_at` predicate.
 *
 *   If the UPDATE matches zero rows, the throttle rejected the
 *   write — return 429 with a Retry-After header so the client
 *   can back off cleanly.
 *
 * Uses the user-scoped client so the existing driver_profile_own_update
 * RLS policy enforces ownership (auth.uid() = id).
 */
const MIN_WRITE_INTERVAL_MS = 8_000;

export const PATCH = withLogger('driver.location.update', async (request) => {
  const { user, supabase, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { data: body, errorResponse: validationErr } =
    await validateBody(request, UpdateLocationSchema);
  if (validationErr) return validationErr;
  const { lat, lng } = body;

  // Only accept the write when the last fix is at least
  // MIN_WRITE_INTERVAL_MS old (or there is no prior fix). The
  // predicate is evaluated server-side in a single UPDATE so a
  // client can't race itself by sending two writes 1ms apart.
  const cutoff = new Date(Date.now() - MIN_WRITE_INTERVAL_MS).toISOString();

  const { data, error } = await supabase
    .from('driver_profiles')
    .update({
      current_lat:         lat,
      current_lng:         lng,
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    // location_updated_at IS NULL  OR  location_updated_at < cutoff
    .or(`location_updated_at.is.null,location_updated_at.lt.${cutoff}`)
    .select('location_updated_at');

  if (error) {
    console.error('[PATCH /api/driver/location]', error.message);
    return serverError('Failed to update location');
  }

  // Zero rows updated → throttle hit. Return 429 with a
  // best-effort Retry-After so the client app stops hammering.
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Location updates throttled. Please wait before retrying.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(MIN_WRITE_INTERVAL_MS / 1000)) },
      },
    );
  }

  return ok({ lat, lng });
});
