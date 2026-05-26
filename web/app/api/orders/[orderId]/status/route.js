import { after } from 'next/server';

import { sendEmail }                      from '@/lib/server/email/send';
import { orderPickedUp, orderDelivered }  from '@/lib/server/email/templates';

import { requireDriver }     from '@/lib/server/driverGuard';
import { getAdminSupabase }  from '@/lib/server/supabase.admin';
import { badRequest, notFound, serverError, ok } from '@/lib/api/response';
import { validateBody }      from '@/lib/api/validate';
import { AdvanceOrderStatusSchema } from '@/lib/api/schemas/orders';
import { withLogger } from '@/lib/api/withLogger';

/**
 * PATCH /api/orders/[orderId]/status
 *
 * Advances the delivery status along the driver-controlled progression:
 *   processing → in_transit   (driver has picked up the package)
 *   in_transit  → delivered   (driver has completed the delivery)
 *
 * Uses the user-scoped Supabase client so the orders_driver_update RLS policy
 * enforces that the driver can only update rows where driver_id = auth.uid().
 * Illegal status jumps are rejected before hitting the database.
 */

const TRANSITIONS = {
  processing: 'in_transit',
  in_transit:  'delivered',
};

const TIMESTAMP_FIELD = {
  in_transit: 'pickup_at',
  delivered:  'delivered_at',
};

export const PATCH = withLogger('orders.status.update', async (request, { params }) => {
  const { user, supabase, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { orderId } = await params;

  const { data: body, errorResponse: validationErr } =
    await validateBody(request, AdvanceOrderStatusSchema);
  if (validationErr) return validationErr;
  const requestedStatus = body.status;

  // Fetch the current status to validate the transition.
  const { data: current, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, driver_id, user_id, pickup, dropoff')
    .eq('id', orderId)
    .single();

  if (fetchError || !current) return notFound('Order not found');

  // Confirm the driver owns this order (belt-and-suspenders — RLS already does this).
  if (current.driver_id !== user.id) return notFound('Order not found');

  const expectedNext = TRANSITIONS[current.status];
  if (expectedNext !== requestedStatus) {
    return badRequest(
      `Invalid transition: ${current.status} → ${requestedStatus}. Expected ${expectedNext ?? 'no further transitions'}.`
    );
  }

  const updates = { status: requestedStatus };
  const tsField = TIMESTAMP_FIELD[requestedStatus];
  if (tsField) updates[tsField] = new Date().toISOString();

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select('id, status')
    .single();

  if (error || !data) {
    console.error('[PATCH /api/orders/[orderId]/status]', error?.message);
    return serverError('Failed to update order status');
  }

  // Terminal transition → free the driver slot and bump their trip count.
  // SECURITY DEFINER RPC is service-role-only, so we use the admin client.
  if (data.status === 'delivered') {
    const { error: completeErr } = await getAdminSupabase().rpc('complete_order', {
      p_order_id:      data.id,
      p_driver_id:     user.id,
      p_was_delivered: true,
    });
    if (completeErr) {
      // Non-fatal — the order is delivered. Log loudly so we can reconcile.
      console.error('[orders/status] complete_order failed:', completeErr.message);
    }
  }

  // Send customer notification after the response flushes.
  // Non-fatal: email failure must never block the status confirmation.
  after(async () => {
    const admin = getAdminSupabase();
    const { data: customer } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', current.user_id)
      .single();

    if (!customer?.email) return;

    if (requestedStatus === 'in_transit') {
      await sendEmail({
        to: customer.email,
        ...orderPickedUp({
          name:    customer.full_name ?? undefined,
          orderId: data.id,
          dropoff: current.dropoff   ?? undefined,
        }),
      });
    } else if (requestedStatus === 'delivered') {
      await sendEmail({
        to: customer.email,
        ...orderDelivered({
          name:    customer.full_name ?? undefined,
          orderId: data.id,
        }),
      });
    }
  });

  return ok({ orderId: data.id, status: data.status });
});
