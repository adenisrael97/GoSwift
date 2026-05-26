import { after } from 'next/server';

import { requireDriver }    from '@/lib/server/driverGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, badRequest, notFound, conflict, forbidden, serverError } from '@/lib/api/response';
import { validateBody }     from '@/lib/api/validate';
import { ReleaseOrderSchema } from '@/lib/api/schemas/orders';
import { withLogger }       from '@/lib/api/withLogger';
import { dispatchOrder }    from '@/lib/server/dispatch/dispatchService';

/**
 * POST /api/driver/orders/[orderId]/release
 *
 * Driver releases (un-accepts) an order before pickup. Only allowed
 * while the order is in the 'processing' state — once the driver marks
 * pickup (in_transit) they can no longer back out via self-service.
 *
 * The driver_release_order() RPC handles all writes atomically:
 *   1. Clears driver busy flag (driver_profiles.current_order_id → NULL)
 *   2. Marks their dispatch_offer 'released' (prevents re-offer of same order)
 *   3. Resets order to 'confirmed' with a fresh dispatch_attempts counter
 *
 * After the RPC succeeds, we immediately re-dispatch to the next nearest
 * available driver. The releasing driver is automatically excluded because
 * find_and_offer_driver() skips any driver who already has an offer row
 * for the order (regardless of status).
 *
 * Error → HTTP mapping:
 *   order_not_found      → 404
 *   not_order_driver     → 403 (authenticated but wrong driver)
 *   too_late_to_release  → 409 (package already picked up)
 *   order_not_releasable → 409 (terminal or wrong state)
 */
export const POST = withLogger('driver.orders.release.create', async (request, { params }) => {
  const { user, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { orderId } = await params;
  if (!orderId) return badRequest('orderId is required');

  // Reason is optional — only parse if the client sent a body.
  let reason = null;
  const contentLength = request.headers.get('content-length');
  if (contentLength && contentLength !== '0') {
    const { data, errorResponse: validationErr } = await validateBody(request, ReleaseOrderSchema);
    if (validationErr) return validationErr;
    reason = data.reason?.trim() || null;
  }

  const { data, error } = await getAdminSupabase().rpc('driver_release_order', {
    p_order_id:  orderId,
    p_driver_id: user.id,
    p_reason:    reason,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('order_not_found'))      return notFound('Order not found');
    if (code.includes('not_order_driver'))     return forbidden('This order is not assigned to you');
    if (code.includes('too_late_to_release'))  return conflict('Package already picked up — contact support to transfer');
    if (code.includes('order_not_releasable')) return conflict('Order cannot be released in its current state');
    console.error('[POST /api/driver/orders/:id/release]', error.message);
    return serverError('Failed to release order');
  }

  // Re-dispatch to the next nearest driver after the response flushes.
  // The releasing driver is excluded automatically via their 'released'
  // offer row — no extra logic needed here.
  after(async () => {
    const result = await dispatchOrder(orderId);
    if (!result.offered) {
      console.warn('[release] re-dispatch found no driver:', result.reason);
    }
  });

  return ok({ orderId, status: 'confirmed' });
});
