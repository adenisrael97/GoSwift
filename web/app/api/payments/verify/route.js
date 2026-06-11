/**
 * POST /api/payments/verify
 *
 * Step 3 of the Paystack card-payment flow (called from the callback page).
 *
 * - Looks up the order by reference (= order UUID)
 * - Enforces ownership: only the order owner can verify
 * - Verifies the transaction against the Paystack API
 * - Validates amount, currency, and status — never trusts frontend data
 * - Atomically updates order to payment_status:'paid', status:'confirmed'
 * - Triggers driver dispatch
 *
 * Idempotent: returns success immediately if the order is already paid,
 * which handles the case where the webhook beat the callback page.
 */
import 'server-only';

import { requireAuth }                         from '@/lib/server/supabase.server';
import { ok, badRequest, notFound, serverError } from '@/lib/api/response';
import { withLogger }                           from '@/lib/api/withLogger';
import { verifyTransaction }                    from '@/lib/server/paystack/client';
import { getAdminSupabase }                     from '@/lib/server/supabase.admin';
import { dispatchOrder }                        from '@/lib/server/dispatch/dispatchService';

export const POST = withLogger('payments.verify', async (request) => {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  let reference;
  try {
    const body = await request.json();
    reference  = body?.reference?.toString().trim();
  } catch {
    return badRequest('Invalid request body');
  }

  if (!reference) return badRequest('reference is required');

  const admin = getAdminSupabase();

  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('id, user_id, fare_amount, payment_status, status')
    .eq('id', reference)
    .maybeSingle();

  if (fetchErr || !order) return notFound('Order not found');

  // Ownership check — prevent cross-user verification
  if (order.user_id !== user.id) return notFound('Order not found');

  // Idempotency: already confirmed (webhook may have beaten the callback)
  if (order.payment_status === 'paid') {
    return ok({ success: true, orderId: order.id, idempotent: true });
  }

  // Verify with Paystack — the source of truth for transaction status
  const { ok: psOk, data: psData } = await verifyTransaction(reference);

  if (!psOk) {
    return serverError('Payment verification service unavailable. Please try again.');
  }

  const txData        = psData?.data;
  const expectedKobo  = Math.round(order.fare_amount * 100);
  const isSuccess     = txData?.status     === 'success';
  const amountMatches = txData?.amount     === expectedKobo;
  const currencyOk    = txData?.currency   === 'NGN';

  if (!isSuccess || !amountMatches || !currencyOk) {
    // Mark failed so the order doesn't stay in 'pending' indefinitely
    await admin
      .from('orders')
      .update({ payment_status: 'failed', status: 'cancelled' })
      .eq('id', order.id)
      .eq('payment_status', 'pending');

    console.warn('[payments.verify] Verification mismatch:', {
      orderId:        order.id,
      isSuccess,
      amountMatches,
      currencyOk,
      paystackStatus: txData?.status,
      paystackAmount: txData?.amount,
      expectedKobo,
    });

    return ok({ success: false, orderId: order.id });
  }

  // Atomic update — .eq('payment_status', 'pending') prevents a race where
  // the webhook and the callback both try to confirm the same order.
  const { data: updated, error: updateErr } = await admin
    .from('orders')
    .update({ payment_status: 'paid', status: 'confirmed' })
    .eq('id', order.id)
    .eq('payment_status', 'pending')
    .select('id');

  if (updateErr) {
    console.error('[payments.verify] Update failed:', updateErr.message);
    return serverError('Failed to update order status. Please contact support.');
  }

  // 0 rows updated means another process (webhook) confirmed first — still success.
  if (!updated || updated.length === 0) {
    return ok({ success: true, orderId: order.id, idempotent: true });
  }

  const dispatchResult = await dispatchOrder(order.id).catch((err) => {
    console.warn('[payments.verify] Dispatch threw:', err.message);
    return { offered: false, reason: 'dispatch_exception' };
  });

  return ok({
    success:  true,
    orderId:  order.id,
    dispatch: {
      offered: dispatchResult.offered,
      reason:  dispatchResult.offered ? null : dispatchResult.reason,
    },
  });
});
