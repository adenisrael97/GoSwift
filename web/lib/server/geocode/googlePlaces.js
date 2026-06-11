/**
 * Server-only Google Places (New) client for address autocomplete + geocoding.
 *
 * The API key (GOOGLE_MAPS_API_KEY) is read here and NEVER sent to the
 * browser — the /api/geocode/* routes proxy these calls so the billable key
 * stays server-side and can be IP/referrer-unrestricted but request-gated by
 * our own auth.
 *
 * Graceful degradation: if the key is not configured, isGeocodeEnabled()
 * returns false and the routes short-circuit to an empty result. The order
 * form then behaves exactly as before (plain free-text address inputs), so a
 * missing key never breaks ordering.
 *
 * Results are biased to Nigeria (includedRegionCodes: ['ng']).
 */
import 'server-only';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL      = 'https://places.googleapis.com/v1/places';

export function isGeocodeEnabled() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

function getKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('[geocode] GOOGLE_MAPS_API_KEY is not set');
  return key;
}

/**
 * Address predictions for a typed query.
 *
 * @param {string} input
 * @param {string} [sessionToken]  Groups keystrokes + the following details
 *                                 call into one billable session.
 * @returns {Promise<Array<{ placeId: string, description: string }>>}
 */
export async function autocompleteAddress(input, sessionToken) {
  if (!input?.trim()) return [];

  const res = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type':   'application/json',
      'X-Goog-Api-Key': getKey(),
    },
    body: JSON.stringify({
      input,
      includedRegionCodes: ['ng'],
      ...(sessionToken ? { sessionToken } : {}),
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    console.warn('[geocode] autocomplete failed:', res.status);
    return [];
  }

  const data = await res.json().catch(() => null);
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];

  return suggestions
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p) => ({
      placeId:     p.placeId,
      description: p.text?.text ?? '',
    }))
    .filter((p) => p.placeId && p.description);
}

/**
 * Resolve a placeId to coordinates + a formatted address.
 *
 * @param {string} placeId
 * @param {string} [sessionToken]  Same token used for the autocomplete calls.
 * @returns {Promise<{ lat: number, lng: number, address: string } | null>}
 */
export async function placeDetails(placeId, sessionToken) {
  if (!placeId) return null;

  const url = new URL(`${DETAILS_URL}/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key':   getKey(),
      'X-Goog-FieldMask': 'location,formattedAddress',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.warn('[geocode] place details failed:', res.status);
    return null;
  }

  const data = await res.json().catch(() => null);
  const loc  = data?.location;
  if (typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') {
    return null;
  }

  return {
    lat:     loc.latitude,
    lng:     loc.longitude,
    address: data.formattedAddress ?? '',
  };
}
