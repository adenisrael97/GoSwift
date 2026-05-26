/**
 * /api/orders
 *
 * GET  — returns the authenticated user's order history (newest first)
 * POST — creates a new order after payment is confirmed
 *
 * Security model:
 *   • Every request must carry Authorization: Bearer <supabase_access_token>
 *   • requireAuth() validates the token against Supabase Auth (checks revocation)
 *   • The scoped Supabase client forwards the JWT on all DB calls
 *   • RLS policies (auth.uid() = user_id) enforce row ownership at the DB level
 *   • Application-level checks are a second layer, not the only defence
 */

import { requireAuth }                from '@/lib/server/supabase.server';
import { ok, created, serverError } from '@/lib/api/response';
import { validateBody }               from '@/lib/api/validate';
import { withLogger }                 from '@/lib/api/withLogger';
import { CreateOrderSchema }          from '@/lib/api/schemas/orders';
import { dispatchOrder }              from '@/lib/server/dispatch/dispatchService';
import { getAdminSupabase }           from '@/lib/server/supabase.admin';

// ── GET /api/orders ──────────────────────────────────────────────────────────

export const GET = withLogger('orders.list', async (request) => {
  const { user, supabase, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      pickup,
      dropoff,
      package_type,
      vehicle_type,
      weight,
      fare_amount,
      payment_method,
      payment_status,
      status,
      note,
      sender_phone,
      receiver_name,
      receiver_phone,
      created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GET /api/orders]', error.message);
    return serverError('Failed to fetch orders');
  }

  return ok({ orders });
});

// ── POST /api/orders ─────────────────────────────────────────────────────────

export const POST = withLogger('orders.create', async (request) => {
  const { user, supabase, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  // Idempotency: a retried POST (network glitch, double-tap, mobile
  // backgrounded mid-request) returns the original order instead of
  // creating a new one. The client opts in by sending an
  // `Idempotency-Key: <uuid>` header. Without the header we keep the
  // legacy behaviour — first POST wins, no de-dup.
  const idempotencyKey = readIdempotencyKey(request);

  if (idempotencyKey) {
    const existing = await findExistingOrderForKey(user.id, idempotencyKey);
    if (existing) {
      return created({
        order: existing,
        dispatch: { offered: null, reason: 'idempotent_replay' },
        idempotent: true,
      });
    }
  }

  // Validate + coerce request body. The Zod schema is the source of
  // truth for the API contract — see lib/api/schemas/orders.js.
  const { data: payload, errorResponse: validationErr } =
    await validateBody(request, CreateOrderSchema);
  if (validationErr) return validationErr;

  const {
    pickup, dropoff, packageType, vehicleType, weight, note, fareEstimate, paymentMethod,
    pickupLat, pickupLng, dropoffLat, dropoffLng,
    senderPhone, receiverName, receiverPhone,
  } = payload;

  // ── Persist ───────────────────────────────────────────────
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id:        user.id,
      pickup:         pickup.trim(),
      pickup_lat:     pickupLat != null ? Number(pickupLat) : null,
      pickup_lng:     pickupLng != null ? Number(pickupLng) : null,
      dropoff:        dropoff.trim(),
      dropoff_lat:    dropoffLat != null ? Number(dropoffLat) : null,
      dropoff_lng:    dropoffLng != null ? Number(dropoffLng) : null,
      package_type:   packageType ?? 'parcel',
      vehicle_type:   vehicleType ?? 'car',
      weight:         Number(weight) || 0,
      note:           note?.trim() || null,
      fare_amount:    Number(fareEstimate),
      payment_method: paymentMethod,
      payment_status: 'paid',
      status:         'confirmed',
      sender_phone:   senderPhone?.trim()  || null,
      receiver_name:  receiverName?.trim() || null,
      receiver_phone: receiverPhone?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/orders] Insert failed for user', user?.id, ':', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return serverError('Failed to create order. Please try again.');
  }

  console.log('[POST /api/orders] Order created:', {
    orderId: order?.id,
    userId: user?.id,
    status: order?.status,
    fareAmount: order?.fare_amount,
  });

  // Persist the idempotency mapping AFTER the order row exists so the FK
  // is always satisfied. Race handling: two requests with the same key
  // arrive in parallel → both create an order, then the second insert
  // fails the (user_id, key) unique constraint. We detect that and
  // delete the duplicate order so the user sees a single canonical row.
  if (idempotencyKey) {
    const claimed = await claimIdempotencyKey(user.id, idempotencyKey, order.id);
    if (!claimed) {
      // Lost the race — fetch the winner and delete our duplicate.
      const winner = await findExistingOrderForKey(user.id, idempotencyKey);
      await getAdminSupabase().from('orders').delete().eq('id', order.id);
      if (winner) {
        return created({
          order: winner,
          dispatch: { offered: null, reason: 'idempotent_replay' },
          idempotent: true,
        });
      }
      // Edge case: race lost but winner row gone (TTL'd between insert
      // and our re-read). Treat as success on our own row, recreating
      // the key mapping is not possible but the order is still valid.
    }
  }

  // Synchronous first dispatch attempt. We await it so the client gets
  // immediate feedback ("driver assigned" vs "looking for drivers"),
  // but a failure here is non-fatal — the cron sweep will retry.
  const dispatchResult = await dispatchOrder(order.id).catch((err) => {
    console.warn('[POST /api/orders] dispatch threw:', err.message);
    return { offered: false, reason: 'dispatch_exception' };
  });

  return created({
    order,
    dispatch: {
      offered: dispatchResult.offered,
      reason:  dispatchResult.offered ? null : dispatchResult.reason,
    },
  });
});

// ── Idempotency helpers ───────────────────────────────────────────────────────

const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;

/**
 * Reads the Idempotency-Key header and validates its shape.
 * Returns null when missing or malformed (treated as opt-out).
 */
function readIdempotencyKey(request) {
  const raw = request.headers.get(IDEMPOTENCY_HEADER);
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Looks up the order previously created under (user_id, key). Returns
 * the full order row, or null if no mapping exists.
 *
 * The two-statement lookup (key → order_id → order row) is one
 * round-trip via PostgREST's foreign-table embedding. Service-role
 * client because the idempotency table is RLS-locked.
 */
async function findExistingOrderForKey(userId, key) {
  const { data, error } = await getAdminSupabase()
    .from('order_idempotency_keys')
    .select('order_id, order:orders!order_idempotency_keys_order_id_fkey(*)')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.warn('[orders.findExistingOrderForKey]', error.message);
    return null;
  }
  return data?.order ?? null;
}

/**
 * Tries to insert the (user_id, key) → order_id mapping. Returns true
 * on success, false if the unique constraint already existed (race).
 */
async function claimIdempotencyKey(userId, key, orderId) {
  const { error } = await getAdminSupabase()
    .from('order_idempotency_keys')
    .insert({ user_id: userId, key, order_id: orderId });
  if (!error) return true;
  // 23505 = unique_violation — expected race; anything else is real.
  if (error.code !== '23505') {
    console.warn('[orders.claimIdempotencyKey]', error.message);
  }
  return false;
}

