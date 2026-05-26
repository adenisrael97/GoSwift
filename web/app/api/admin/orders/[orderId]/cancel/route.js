import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, badRequest, notFound, serverError } from '@/lib/api/response';
import { validateBody }    from '@/lib/api/validate';
import { CancelOrderSchema } from '@/lib/api/schemas/orders';
import { withLogger } from '@/lib/api/withLogger';

/**
 * POST /api/admin/orders/[orderId]/cancel
 *
 * Admin cancels any non-terminal order. Same RPC as the customer
 * cancel route, with p_actor_role='admin' which skips the
 * pickup-time gate (admins can cancel up to but not including
 * delivery).
 */
export const POST = withLogger('admin.orders.cancel.create', async (request, { params }) => {
  const { user, errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { orderId } = await params;
  if (!orderId) return badRequest('orderId is required');

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
    p_actor_role: 'admin',
    p_reason:     reason,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('order_not_found')) return notFound('Order not found');
    console.error('[POST /api/admin/orders/:id/cancel]', error.message);
    return serverError('Failed to cancel order');
  }

  const row = Array.isArray(data) ? data[0] : null;
  return ok({
    orderId:          row?.order_id ?? orderId,
    status:           row?.status   ?? 'cancelled',
    previousDriverId: row?.previous_driver_id ?? null,
  });
});
