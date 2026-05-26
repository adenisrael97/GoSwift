import { requireDriver }    from '@/lib/server/driverGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, badRequest, notFound, serverError } from '@/lib/api/response';
import { dispatchOrder, shouldRetryDispatch } from '@/lib/server/dispatch/dispatchService';
import { withLogger } from '@/lib/api/withLogger';

/**
 * POST /api/driver/offers/[offerId]/reject
 *
 * Driver declines an offer. Marks it rejected in the DB and
 * immediately kicks off a re-dispatch to the next nearest driver
 * (instead of waiting for the cron sweep — better UX for the user
 * watching the order spinner).
 */
export const POST = withLogger('driver.offers.reject.create', async (request, { params }) => {
  const { user, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { offerId } = await params;
  if (!offerId) return badRequest('offerId is required');

  const admin = getAdminSupabase();

  const { data: orderId, error } = await admin.rpc('reject_dispatch_offer', {
    p_offer_id:  offerId,
    p_driver_id: user.id,
  });

  if (error) {
    const code = error.message || '';
    if (code.includes('offer_not_found') || code.includes('offer_not_yours')) {
      return notFound('Offer not found');
    }
    console.error('[POST /api/driver/offers/:id/reject]', error.message);
    return serverError('Failed to reject offer');
  }

  // Re-dispatch to next nearest driver. Fire-and-forget so we don't
  // block the rejecting driver's UI — they're already on to the next
  // screen. The cron will catch it if this RPC fails silently.
  if (orderId && (await shouldRetryDispatch(orderId))) {
    dispatchOrder(orderId).catch((err) =>
      console.warn('[reject] re-dispatch threw:', err.message)
    );
  }

  return ok({ offerId, rejected: true, orderId });
});
