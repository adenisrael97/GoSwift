'use client';

/**
 * Per-vehicle pricing fetched from the admin-controlled /api/pricing.
 *
 * Cached at the module level so OrderForm, checkout, and the request
 * picker all share a single network round-trip per page load — no
 * provider/context required for an MVP.
 */
import { useEffect, useState } from 'react';
import { DEFAULT_VEHICLE_PRICING } from './vehicleRates';

let cache    = null;
let inflight = null;

function fetchOnce() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/pricing', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        cache = j?.vehicles ?? DEFAULT_VEHICLE_PRICING;
        return cache;
      })
      .catch(() => {
        cache = DEFAULT_VEHICLE_PRICING;
        return cache;
      });
  }
  return inflight;
}

export function usePricing() {
  const [pricing, setPricing] = useState(cache ?? DEFAULT_VEHICLE_PRICING);

  useEffect(() => {
    let cancelled = false;
    fetchOnce().then((p) => {
      if (!cancelled) setPricing(p);
    });
    return () => { cancelled = true; };
  }, []);

  return pricing;
}
