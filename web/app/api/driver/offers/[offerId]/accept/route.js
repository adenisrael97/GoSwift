import { after } from 'next/server';

import { sendEmail }           from '@/lib/server/email/send';
import { orderDriverAssigned } from '@/lib/server/email/templates';

import { requireDriver }    from '@/lib/server/driverGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, badRequest, notFound, conflict, serverError } from '@/lib/api/response';
import { withLogger } from '@/lib/api/withLogger';

/**
 * POST /api/driver/offers/[offerId]/accept
 *
 * Driver claims a dispatch offer. Every concurrency-sensitive step
 * runs inside the accept_dispatch_offer RPC, so this route just
 * forwards and translates the SQL error codes into HTTP responses.
 *
 * Errors → HTTP mapping:
 *   offer_not_found     → 404
 *   offer_not_yours     → 404 (don't leak existence to wrong driver)
 *   offer_not_open      → 409 (already responded — treat as idempotent failure)
 *   offer_expired       → 409
 *   order_already_claimed → 409
 *   driver_already_busy → 409
 */
export const POST = withLogger('driver.offers.accept.create', async (request, { params }) => {
  const { user, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { offerId } = await params;
  if (!offerId) return badRequest('offerId is required');

  const { data, error } = await getAdminSupabase().rpc('accept_dispatch_offer', {
    p_offer_id:  offerId,
    p_driver_id: user.id,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('offer_not_found') || code.includes('offer_not_yours')) {
      return notFound('Offer not found');
    }
    if (code.includes('offer_not_open')) {
      return conflict('You already responded to this offer');
    }
    if (code.includes('offer_expired')) {
      return conflict('Offer expired — too late');
    }
    if (code.includes('order_already_claimed')) {
      return conflict('Another driver got there first');
    }
    if (code.includes('driver_already_busy')) {
      return conflict('Finish your current delivery before accepting another');
    }
    console.error('[POST /api/driver/offers/:id/accept]', error.message);
    return serverError('Failed to accept offer');
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return serverError('Accept returned no data');

  const orderId = row.order_id;

  // Send "driver assigned" notification after the response flushes.
  // Non-fatal: email failure must never block the accept confirmation.
  after(async () => {
    const admin = getAdminSupabase();
    const { data: orderRow } = await admin
      .from('orders')
      .select(`
        pickup,
        customer:profiles!orders_user_id_fkey (full_name, email),
        driver:profiles!orders_driver_id_fkey (full_name)
      `)
      .eq('id', orderId)
      .single();

    if (!orderRow?.customer?.email) return;

    await sendEmail({
      to: orderRow.customer.email,
      ...orderDriverAssigned({
        name:       orderRow.customer.full_name ?? undefined,
        driverName: orderRow.driver?.full_name  ?? undefined,
        orderId,
        pickup:     orderRow.pickup             ?? undefined,
      }),
    });
  });

  return ok({ orderId, status: row.status });
});
