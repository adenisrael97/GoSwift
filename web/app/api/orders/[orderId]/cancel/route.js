import { requireAuth }      from '@/lib/server/supabase.server';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, badRequest, notFound, conflict, forbidden, serverError } from '@/lib/api/response';
import { validateBody }     from '@/lib/api/validate';
import { CancelOrderSchema } from '@/lib/api/schemas/orders';
import { withLogger } from '@/lib/api/withLogger';

/**
 * POST /api/orders/[orderId]/cancel
 *
 * Customer cancels their own order. Allowed only while the order has
 * not been picked up (status in pending/confirmed/processing). Once the
 * driver marks pickup (in_transit) the customer can no longer cancel —
 * that's an admin-only path.
 *
 * Delegates to cancel_order RPC so the status flip, driver release, and
 * dispatch_offers expiry happen atomically with FOR UPDATE locking.
 */
export const POST = withLogger('orders.cancel.create', async (request, { params }) => {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { orderId } = await params;
  if (!orderId) return badRequest('orderId is required');

  // Body is optional — clients may POST without a reason. Validate only
  // when content-length indicates a payload was sent.
  /** @type {string | null} */
  let reason = null;
  const hasBody = request.headers.get('content-length')
                && request.headers.get('content-length') !== '0';
  if (hasBody) {
    const { data, errorResponse: validationErr } =
      await validateBody(request, CancelOrderSchema);
    if (validationErr) return validationErr;
    reason = data.reason?.trim() || null;
  }

  const { data, error } = await getAdminSupabase().rpc('cancel_order', {
    p_order_id:   orderId,
    p_actor_id:   user.id,
    p_actor_role: 'customer',
    p_reason:     reason,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('order_not_found'))    return notFound('Order not found');
    if (code.includes('not_order_owner'))    return forbidden('You can only cancel your own orders');
    if (code.includes('too_late_to_cancel')) return conflict('Order has already been picked up; contact support to cancel');
    console.error('[POST /api/orders/:id/cancel]', error.message);
    return serverError('Failed to cancel order');
  }

  const row = Array.isArray(data) ? data[0] : null;
  return ok({
    orderId: row?.order_id ?? orderId,
    status:  row?.status   ?? 'cancelled',
  });
});
