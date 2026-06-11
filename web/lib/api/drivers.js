/**
 * Drivers API — driver-side reads/writes.
 *
 * - Profile + dashboard reads route through /api/driver/* so RLS and
 *   role enforcement happen server-side.
 * - Online toggle / location ping / offer accept/reject all go via
 *   /api/driver/* mutations.
 * - Direct Supabase reads cover the driver profile detail screen and
 *   offer hydration (both RLS-scoped to the calling driver).
 * - Realtime subscription factories wrap the channel construction so
 *   driver pages never touch the raw client.
 */
import { supabase, authedFetch, anonymousFetch, authedUpload } from './client';

// ── Reads via /api/driver/* ──────────────────────────────────────────

/** GET /api/driver/dashboard — aggregated dashboard payload (profile + stats + recent). */
export function getDriverDashboard() {
  return authedFetch('/api/driver/dashboard', { method: 'GET' });
}

/** GET /api/driver/earnings — pre-aggregated summary for the Earnings screen. */
export function getDriverEarnings() {
  return authedFetch('/api/driver/earnings', { method: 'GET' });
}

/** GET /api/driver/orders — paginated driver order list. */
export function listDriverOrders({ page = 1, limit = 20 } = {}) {
  return authedFetch(`/api/driver/orders?page=${page}&limit=${limit}`, { method: 'GET' });
}

// ── Direct Supabase reads (RLS-scoped) ───────────────────────────────

/** Profile screen — full driver row joined with the profiles row. */
export async function getDriverProfileDetail(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      full_name, phone, email, created_at,
      driver_profiles (
        is_online, rating, total_trips,
        vehicle_type, vehicle_model, plate_number, vehicle_color
      )
    `)
    .eq('id', userId)
    .single();
  return { data: data ?? null, error: error ?? null };
}

/** Most recent application — drives the Documents card on the profile screen. */
export async function getDriverApplicationDocs(userId) {
  const { data, error } = await supabase
    .from('driver_applications')
    .select('license_url, nin_doc_url, particulars_url')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();
  return { data: data ?? null, error: error ?? null };
}

/** Slim driver-side order detail with the customer join. */
export async function getDriverOrder(orderId, driverId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:profiles!orders_user_id_fkey(full_name, phone)')
    .eq('id', orderId)
    .eq('driver_id', driverId)
    .single();
  return { data: data ?? null, error: error ?? null };
}

/**
 * Live offers currently addressed to a driver. RLS limits the SELECT to
 * offers for the caller; we still apply driver_id explicitly so the
 * planner picks the index even if RLS is permissive in tests.
 */
export async function listLiveOffers(driverId) {
  const { data, error } = await supabase
    .from('dispatch_offers')
    .select(`
      id, distance_km, expires_at, created_at,
      order:orders!order_id (
        id, pickup, dropoff, fare_amount, package_type, weight
      )
    `)
    .eq('driver_id', driverId)
    .eq('status', 'offered')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return { data: data ?? [], error: error ?? null };
}

/**
 * Realtime offer events carry dispatch_offer fields only. Use this to
 * pull the joined order row before rendering the offer card.
 */
export async function getOfferOrderBrief(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, pickup, dropoff, fare_amount, package_type, weight')
    .eq('id', orderId)
    .single();
  return { data: data ?? null, error: error ?? null };
}

// ── Mutations via /api/driver/* ──────────────────────────────────────

/** PATCH /api/driver/status — toggle is_online. Server validates fresh-fix gate. */
export function setDriverOnline(isOnline) {
  return authedFetch('/api/driver/status', {
    method: 'PATCH',
    body:   JSON.stringify({ isOnline }),
  });
}

/** PATCH /api/driver/location — throttle on the caller side; server stores last fix. */
export function postDriverLocation({ lat, lng }) {
  return authedFetch('/api/driver/location', {
    method: 'PATCH',
    body:   JSON.stringify({ lat, lng }),
  });
}

/** POST /api/driver/apply — requires an active session (form is auth-gated). */
export function applyAsDriver(payload) {
  return authedFetch('/api/driver/apply', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

/**
 * POST /api/driver/documents — upload KYC files to the private bucket.
 *
 * @param {{ license?: File, nin_doc?: File, particulars?: File }} files
 * @returns {Promise<{ ok: boolean, status: number, body: { licenseUrl?: string, ninDocUrl?: string, particularsUrl?: string, error?: string } }>}
 */
export function uploadDriverDocuments(files) {
  const fd = new FormData();
  for (const field of ['license', 'nin_doc', 'particulars']) {
    if (files[field] instanceof File) fd.append(field, files[field]);
  }
  return authedUpload('/api/driver/documents', fd);
}

/** POST /api/driver/offers/[id]/accept — first-accept-wins; server returns 409 on race. */
export function acceptOffer(offerId) {
  return authedFetch(`/api/driver/offers/${offerId}/accept`, { method: 'POST' });
}

/** POST /api/driver/offers/[id]/reject — frees up the offer for the next driver. */
export function rejectOffer(offerId) {
  return authedFetch(`/api/driver/offers/${offerId}/reject`, { method: 'POST' });
}

/**
 * POST /api/driver/orders/[id]/release
 *
 * Driver releases an accepted order before pickup. The order returns to
 * 'confirmed' and is immediately re-dispatched to the next nearest driver.
 * The releasing driver is excluded from the re-dispatch automatically.
 *
 * @param {string}      orderId
 * @param {string|null} [reason]
 */
export function releaseOrder(orderId, reason = null) {
  return authedFetch(`/api/driver/orders/${orderId}/release`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  });
}

// ── Realtime ─────────────────────────────────────────────────────────

/**
 * Subscribe to all dispatch_offer events for one driver. Server-side
 * filter (driver_id=eq.<me>) keeps the firehose off the wire; RLS would
 * block events anyway but the explicit filter saves bandwidth.
 *
 * Returns the channel so callers can `supabase.removeChannel(channel)`
 * on unmount. One subscription per driver, never shared across hooks.
 */
export function subscribeDriverOffers(driverId, onEvent) {
  return supabase
    .channel(`driver-offers-${driverId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'dispatch_offers',
        filter: `driver_id=eq.${driverId}`,
      },
      onEvent,
    )
    .subscribe();
}

/** Subscribe to UPDATE events on one order (driver detail screen). */
export function subscribeDriverOrder(orderId, onUpdate) {
  return supabase
    .channel(`driver-order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `id=eq.${orderId}`,
      },
      onUpdate,
    )
    .subscribe();
}
