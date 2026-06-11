/**
 * GET /api/geocode/suggest?q=<text>&session=<token>
 *
 * Proxies Google Places autocomplete so the billable key stays server-side.
 * Auth-gated to stop anonymous abuse of the key. Returns an empty list when
 * geocoding is not configured, so the address inputs degrade to plain text.
 *
 * Returns { suggestions: [{ placeId, description }] }.
 */
import 'server-only';

import { requireAuth }        from '@/lib/server/supabase.server';
import { ok }                 from '@/lib/api/response';
import { withLogger }         from '@/lib/api/withLogger';
import { autocompleteAddress, isGeocodeEnabled } from '@/lib/server/geocode/googlePlaces';

export const GET = withLogger('geocode.suggest', async (request) => {
  const { errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  if (!isGeocodeEnabled()) return ok({ suggestions: [] });

  const { searchParams } = new URL(request.url);
  const q       = searchParams.get('q')       ?? '';
  const session = searchParams.get('session') ?? undefined;

  if (q.trim().length < 3) return ok({ suggestions: [] });

  const suggestions = await autocompleteAddress(q, session);
  return ok({ suggestions });
});
