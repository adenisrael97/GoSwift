/**
 * GET /api/geocode/place?id=<placeId>&session=<token>
 *
 * Resolves a Google Places placeId to { lat, lng, address }. Auth-gated.
 * Returns 400 when geocoding is disabled or the id is missing/unresolvable.
 */
import 'server-only';

import { requireAuth }            from '@/lib/server/supabase.server';
import { ok, badRequest }         from '@/lib/api/response';
import { withLogger }             from '@/lib/api/withLogger';
import { placeDetails, isGeocodeEnabled } from '@/lib/server/geocode/googlePlaces';

export const GET = withLogger('geocode.place', async (request) => {
  const { errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  if (!isGeocodeEnabled()) return badRequest('Geocoding is not configured.');

  const { searchParams } = new URL(request.url);
  const id      = searchParams.get('id');
  const session = searchParams.get('session') ?? undefined;

  if (!id) return badRequest('id is required');

  const place = await placeDetails(id, session);
  if (!place) return badRequest('Could not resolve that address.');

  return ok(place);
});
