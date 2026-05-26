import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, notFound, conflict, serverError } from '@/lib/api/response';
import { validateBody }    from '@/lib/api/validate';
import { AssignOrderSchema } from '@/lib/api/schemas/admin';
import { withLogger } from '@/lib/api/withLogger';

/**
 * POST /api/admin/orders/[orderId]/assign
 *
 * Admin manually assigns (or reassigns) a driver to an order.
 *
 * Delegates to admin_assign_driver (migration 018) so the concurrency
 * invariants are enforced inside one Postgres transaction:
 *
 *   • orders.driver_id + status flipped to 'processing'
 *   • new driver's driver_profiles.current_order_id set
 *   • previous driver (if any) released
 *   • live dispatch_offers for this order are expired, and an audit
 *     row in 'accepted' state is inserted so the assigned driver's
 *     realtime channel ticks immediately.
 *
 * Race-safe under concurrent admin clicks: the RPC locks the order
 * row and both driver rows with FOR UPDATE before mutating.
 */
export const POST = withLogger('admin.orders.assign.create', async (request, { params }) => {
  const { user, errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { orderId } = await params;

  const { data: body, errorResponse: validationErr } =
    await validateBody(request, AssignOrderSchema);
  if (validationErr) return validationErr;
  const { driverId } = body;

  const admin = getAdminSupabase();

  // Up-front role check so we can return a clean 404 rather than
  // letting the RPC fail on a missing driver_profiles row.
  const { data: driver } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', driverId)
    .eq('role', 'driver')
    .single();

  if (!driver) return notFound('Driver not found or user is not a driver');

  const { data, error } = await admin.rpc('admin_assign_driver', {
    p_order_id:  orderId,
    p_driver_id: driverId,
    p_admin_id:  user.id,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('order_not_found'))          return notFound('Order not found');
    if (code.includes('order_not_assignable'))     return conflict('Order is not in an assignable state (must be confirmed or processing)');
    if (code.includes('driver_profile_not_found')) return notFound('Driver profile not yet provisioned. Approve the application first.');
    if (code.includes('driver_already_busy'))      return conflict('Driver is already on a different order');
    console.error('[POST /api/admin/orders/:id/assign]', error.message);
    return serverError('Failed to assign driver');
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return serverError('Assignment returned no data');

  return ok({
    orderId:          row.order_id,
    status:           row.status,
    driverId:         row.driver_id,
    driverName:       driver.full_name,
    previousDriverId: row.previous_driver_id ?? null,
  });
});
