/**
 * Geocode API — address autocomplete + place resolution.
 *
 * Thin wrappers over the server proxy routes (which hold the Google Maps
 * key). When geocoding is not configured server-side, suggestAddress returns
 * an empty list, so callers degrade to plain text input automatically.
 */
import { authedFetch } from './client';

/**
 * @param {string} q             Typed query (>= 3 chars to trigger a call).
 * @param {string} [sessionToken]
 * @returns {Promise<{ ok, status, body: { suggestions: Array<{ placeId, description }> } }>}
 */
export function suggestAddress(q, sessionToken) {
  const params = new URLSearchParams({ q });
  if (sessionToken) params.set('session', sessionToken);
  return authedFetch(`/api/geocode/suggest?${params.toString()}`, { method: 'GET' });
}

/**
 * @param {string} placeId
 * @param {string} [sessionToken]
 * @returns {Promise<{ ok, status, body: { lat, lng, address } }>}
 */
export function resolvePlace(placeId, sessionToken) {
  const params = new URLSearchParams({ id: placeId });
  if (sessionToken) params.set('session', sessionToken);
  return authedFetch(`/api/geocode/place?${params.toString()}`, { method: 'GET' });
}
