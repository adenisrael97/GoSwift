/**
 * Orders API — customer-side order reads + writes.
 *
 * - List/get reads hit Supabase directly under RLS (the user can only
 *   see their own rows).
 * - Creation and status changes go through /api/orders so dispatch
 *   rules and fare validation run server-side.
 * - The realtime channel factory wraps supabase.channel(...) so callers
 *   never need to touch the raw client.
 */
import { supabase, authedFetch } from './client';

export const CUSTOMER_ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'in_transit'];

const CUSTOMER_LIST_COLUMNS = 'id, status, pickup, dropoff, fare_amount, package_type, created_at';

/** GET /api/orders — server-rendered list (joins driver + applies pagination). */
export function listMyOrders() {
  return authedFetch('/api/orders', { method: 'GET' });
}

/** Customer order detail — full row, RLS-scoped. */
export async function getMyOrder(orderId, userId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      driver:profiles!orders_driver_id_fkey (
        full_name, phone,
        driver_profiles ( rating, total_trips, vehicle_model, vehicle_type )
      )
    `)
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();
  return { data: data ?? null, error: error ?? null };
}

/** Receipt projection — slimmer column set than the full detail view. */
export async function getMyOrderReceipt(orderId, userId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, status, pickup, dropoff, weight, package_type, vehicle_type,
      fare_amount, payment_method, payment_status,
      created_at, delivered_at,
      driver:profiles!orders_user_id_fkey ( full_name )
    `)
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();
  return { data: data ?? null, error: error ?? null };
}

/** Lightweight list used by dashboards (no joins). */
export async function listRecentMyOrders(userId, limit = 5) {
  const { data, error } = await supabase
    .from('orders')
    .select(CUSTOMER_LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data ?? [], error: error ?? null };
}

/**
 * POST /api/orders — fare computed server-side, returns the created row.
 *
 * Pass `{ idempotencyKey }` to dedupe retries: the server returns the
 * original order on every replay of the same (user, key) pair within
 * 24h. The caller MUST keep the same key across retries — generate it
 * once when the user opens checkout and reuse it on every Pay click.
 *
 * @param {object} payload
 * @param {{ idempotencyKey?: string }} [opts]
 */
export function createOrder(payload, { idempotencyKey } = {}) {
  return authedFetch('/api/orders', {
    method:  'POST',
    body:    JSON.stringify(payload),
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
}

/** POST /api/orders/[id]/cancel — sets status=cancelled atomically. */
export function cancelMyOrder(orderId, reason = null) {
  return authedFetch(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  });
}

/** PATCH /api/orders/[id]/status — server enforces allowed transitions. */
export function advanceOrderStatus(orderId, status) {
  return authedFetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status }),
  });
}

/**
 * Subscribe to UPDATE events on the orders table for one user.
 *
 * Returns the channel so callers can `supabase.removeChannel(channel)`
 * on unmount. The channel name is keyed by userId — one subscription
 * per user, never share across hooks.
 *
 * @param userId  Owner whose orders we want to follow.
 * @param onUpdate  (payload) => void — payload.new holds the updated row.
 */
export function subscribeMyOrders(userId, onUpdate) {
  return supabase
    .channel(`user-orders-${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `user_id=eq.${userId}`,
      },
      onUpdate,
    )
    .subscribe();
}

/**
 * Subscribe to UPDATE events on one specific order (by order ID).
 *
 * Used by the order detail page to react to driver status changes (picked
 * up, delivered) without polling. Returns the channel so callers can call
 * `supabase.removeChannel(channel)` on unmount.
 */
export function subscribeOrderUpdates(orderId, onUpdate) {
  return supabase
    .channel(`order-detail-${orderId}`)
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
