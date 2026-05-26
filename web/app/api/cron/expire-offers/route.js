import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, unauthorized, serverError } from '@/lib/api/response';
import { dispatchOrder, shouldRetryDispatch } from '@/lib/server/dispatch/dispatchService';
import { withLogger } from '@/lib/api/withLogger';

/**
 * POST /api/cron/expire-offers
 *
 * Scheduled job (every ~15s) that:
 *   1. Marks every dispatch_offer past its TTL as 'expired'
 *   2. For each affected order, re-dispatches to the next nearest driver
 *      (up to MAX_DISPATCH_ATTEMPTS — after that the order is left for
 *      admin attention)
 *
 * Auth: a Bearer token equal to process.env.CRON_SECRET. Vercel Cron
 * sends this automatically when the schedule includes one.
 *
 * The handler is idempotent — running it twice in the same second
 * produces no extra work because the RPC only touches offered+expired
 * rows.
 */
export const POST = withLogger('cron.expire-offers.create', async (request) => {
  if (!isAuthorizedCron(request)) return unauthorized('Invalid cron token');

  const admin = getAdminSupabase();

  // 1) Mark expired offers
  const { data: expired, error } = await admin.rpc('expire_stale_offers');
  if (error) {
    console.error('[cron/expire-offers] rpc error:', error.message);
    return serverError('Failed to expire offers');
  }

  const rows = Array.isArray(expired) ? expired : [];

  // 2) Re-dispatch the unique set of affected orders
  const seen = new Set();
  const redispatched = [];
  for (const row of rows) {
    const orderId = row.order_id;
    if (!orderId || seen.has(orderId)) continue;
    seen.add(orderId);

    if (!(await shouldRetryDispatch(orderId))) continue;

    const result = await dispatchOrder(orderId).catch((err) => ({
      offered: false,
      reason: err.message,
    }));
    redispatched.push({ orderId, ...result });
  }

  return ok({
    expiredCount:    rows.length,
    redispatchCount: redispatched.length,
    redispatched,
  });
});

function isAuthorizedCron(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Hard-fail in production so a missing secret can't accidentally
    // open the endpoint.
    if (process.env.NODE_ENV === 'production') return false;
    return true; // dev convenience
  }
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${expected}`;
}
