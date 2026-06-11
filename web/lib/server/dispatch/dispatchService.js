import 'server-only';

import { getAdminSupabase } from '@/lib/server/supabase.admin';

/**
 * Thin wrappers around the Postgres dispatch RPCs. Centralised so
 * every call site (order creation, offer rejection, cron sweep, driver
 * release) hits the same code path and the same radius-expansion logic.
 *
 * All RPCs are SECURITY DEFINER and EXECUTE is restricted to the
 * service role — these helpers must be called with the admin client
 * (getAdminSupabase()), never from the browser or a user-scoped client.
 */

// ── Radius expansion tiers ────────────────────────────────────────────
//
// Dispatch is sequential (one driver at a time, nearest first). When no
// driver is available or all nearby drivers have rejected/timed out, the
// search radius expands automatically so every order has a full path to
// fulfilment without manual intervention.
//
// Tier selection is based on `dispatch_attempts` READ BEFORE the RPC call
// (the RPC increments the counter atomically, so the next call sees +1).
//
//   Attempts 0–2  → Tier 1 (10 km)  — closest drivers, fastest delivery
//   Attempts 3–4  → Tier 2 (25 km)  — wider city area
//   Attempts 5–6  → Tier 3 (50 km)  — Lagos metro-wide fallback
//   Attempt  7+   → MAX reached, leave for admin queue
//
// "Close proximity exhausted before far-away" is enforced naturally:
// find_and_offer_driver() sorts candidates by distance ASC and skips
// drivers who already have any offer row for this order. When we expand
// from 10 → 25 km, untried 9 km drivers are still offered first because
// they are closer; only after all sub-10km options are exhausted does
// the 10–25km ring receive offers. No extra logic required.
//
// Tiers are Lagos-calibrated. Adjust the radiusKm values to fit the
// operating city without changing any application code.

const DISPATCH_RADIUS_TIERS = [
  { maxAttempts: 2, radiusKm: 10 },  // tier 1 — close proximity
  { maxAttempts: 4, radiusKm: 25 },  // tier 2 — city-wide
  { maxAttempts: Infinity, radiusKm: 50 },  // tier 3 — metro-wide fallback
];

const MAX_DISPATCH_ATTEMPTS    = 7;    // 3 tier-1 + 2 tier-2 + 2 tier-3
const DEFAULT_LOCATION_MAX_AGE = 300;  // seconds — driver location counts as "fresh"
const DEFAULT_OFFER_TTL_SEC    = 30;   // seconds — driver has this long to respond

/**
 * Resolve the search radius for the current attempt number.
 * Pure function — no I/O.
 *
 * @param {number} currentAttempts  Value of dispatch_attempts BEFORE the RPC call.
 * @returns {number}  Radius in km.
 */
function resolveDispatchRadius(currentAttempts) {
  for (const tier of DISPATCH_RADIUS_TIERS) {
    if (currentAttempts <= tier.maxAttempts) return tier.radiusKm;
  }
  return DISPATCH_RADIUS_TIERS.at(-1).radiusKm;
}

/**
 * Offer the given order to the nearest free online driver.
 *
 * Reads `dispatch_attempts` first (one indexed PK lookup) to select the
 * correct radius tier, then calls find_and_offer_driver(). The RPC
 * increments the counter atomically, so the next call sees attempts + 1
 * and moves up the tier ladder once the threshold is crossed.
 *
 * This function is intentionally not rate-limited — callers (order
 * creation, rejection handler, release handler, cron sweep) are already
 * gated by shouldRetryDispatch() or the MAX_DISPATCH_ATTEMPTS guard
 * inside that function.
 *
 * @param {string} orderId
 * @param {{ maxAgeSec?: number, offerTtlSec?: number }} [options]
 * @returns {Promise<{ offered: boolean, tier?: number, offer?: { id, driverId, distanceKm }, reason?: string }>}
 */
export async function dispatchOrder(orderId, {
  maxAgeSec   = DEFAULT_LOCATION_MAX_AGE,
  offerTtlSec = DEFAULT_OFFER_TTL_SEC,
} = {}) {
  const admin = getAdminSupabase();

  // One indexed PK lookup to resolve the radius tier. Sub-millisecond at
  // this call frequency — acceptable trade-off versus hardcoding the radius.
  const { data: orderState } = await admin
    .from('orders')
    .select('status, dispatch_attempts')
    .eq('id', orderId)
    .single();

  if (!orderState || orderState.status !== 'confirmed') {
    return { offered: false, reason: 'order_not_dispatchable' };
  }

  const radiusKm   = resolveDispatchRadius(orderState.dispatch_attempts);
  const tierNumber = DISPATCH_RADIUS_TIERS.findIndex((t) => radiusKm === t.radiusKm) + 1;

  const { data, error } = await admin.rpc('find_and_offer_driver', {
    p_order_id:        orderId,
    p_radius_km:       radiusKm,
    p_max_age_seconds: maxAgeSec,
    p_offer_ttl_sec:   offerTtlSec,
  });

  if (error) {
    // When pickup coordinates are missing the RPC cannot compute distance and
    // raises order_missing_pickup_coords. Manually bumping dispatch_attempts
    // ensures this order surfaces to the admin queue after MAX_DISPATCH_ATTEMPTS
    // rather than sitting at 0 forever (the RPC transaction rolls back before it
    // can increment the counter itself).
    if (error.message?.includes('order_missing_pickup_coords')) {
      console.warn(`[dispatchOrder] orderId=${orderId} — missing pickup coordinates, bumping attempts for admin queue`);
      await admin
        .from('orders')
        .update({ dispatch_attempts: (orderState.dispatch_attempts ?? 0) + 1 })
        .eq('id', orderId);
      return { offered: false, reason: 'missing_pickup_coords' };
    }
    console.warn(`[dispatchOrder] tier=${tierNumber} radius=${radiusKm}km rpc error:`, error.message);
    return { offered: false, reason: error.message };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    console.info(`[dispatchOrder] tier=${tierNumber} radius=${radiusKm}km — no driver available`);
    return { offered: false, tier: tierNumber, reason: 'no_driver_available' };
  }

  console.info(`[dispatchOrder] tier=${tierNumber} radius=${radiusKm}km — offered to driver ${row.driver_id} at ${row.distance_km}km`);
  return {
    offered: true,
    tier:    tierNumber,
    offer: {
      id:         row.offer_id,
      driverId:   row.driver_id,
      distanceKm: Number(row.distance_km),
    },
  };
}

/**
 * Check whether we should keep trying to dispatch this order.
 *
 * Returns false once MAX_DISPATCH_ATTEMPTS is reached — at that point all
 * three radius tiers have been tried and the order is left for the admin
 * queue to handle manually.
 *
 * @param {string} orderId
 * @returns {Promise<boolean>}
 */
export async function shouldRetryDispatch(orderId) {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from('orders')
    .select('status, dispatch_attempts')
    .eq('id', orderId)
    .single();

  if (!data)                                        return false;
  if (data.status !== 'confirmed')                  return false;
  if (data.dispatch_attempts >= MAX_DISPATCH_ATTEMPTS) return false;
  return true;
}

export const DISPATCH_LIMITS = {
  MAX_DISPATCH_ATTEMPTS,
  DEFAULT_LOCATION_MAX_AGE,
  DEFAULT_OFFER_TTL_SEC,
  DISPATCH_RADIUS_TIERS,
};
