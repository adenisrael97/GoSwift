/**
 * POST /api/payments/webhook
 *
 * Paystack webhook receiver — resilience layer for the payment flow.
 *
 * This route handles the case where a user pays on Paystack but the
 * browser never loads the callback page (tab closed, network failure,
 * PWA backgrounded). Paystack will retry the webhook until it receives
 * a 2xx response, so orders are eventually confirmed regardless of what
 * the browser does.
 *
 * Security:
 *   - Validates x-paystack-signature (HMAC-SHA512 of raw body with
 *     PAYSTACK_SECRET_KEY) before processing any event.
 *   - Independently re-verifies the transaction against the Paystack API
 *     (never trusts webhook payload data alone).
 *   - Idempotent: returns 200 without re-processing already-confirmed orders.
 *
 * Always returns 200 to Paystack (even on "soft" errors like order not
 * found) to prevent unnecessary retries.
 */
import 'server-only';

import { ok, badRequest, serverError }   from '@/lib/api/response';
import { withLogger }                    from '@/lib/api/withLogger';
import { verifyWebhookSignature, verifyTransaction } from '@/lib/server/paystack/client';
import { getAdminSupabase }              from '@/lib/server/supabase.admin';
import { dispatchOrder }                 from '@/lib/server/dispatch/dispatchService';

const CHARGE_SUCCESS = 'charge.success';

export const POST = withLogger('payments.webhook', async (request) => {
  // Read the raw body before anything else — the signature covers exactly
  // these bytes, so we must not let any middleware re-parse it first.
  const rawBody   = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!signature) return badRequest('Missing x-paystack-signature');

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    console.warn('[payments.webhook] Invalid signature — possible spoofed request');
    return badRequest('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return badRequest('Invalid JSON body');
  }

  // Acknowledge but ignore event types we don't handle
  if (event?.event !== CHARGE_SUCCESS) {
    return ok({ received: true });
  }

  const reference = event.data?.reference;
  if (!reference) return badRequest('Missing reference in event data');

  const admin = getAdminSupabase();

  const { data: order, error: fetchErr } = await admin
    .from('orders')
    .select('id, user_id, fare_amount, payment_status')
    .eq('id', reference)
    .maybeSingle();

  if (fetchErr || !order) {
    // Order not found — log and return 200 so Paystack stops retrying.
    console.warn('[payments.webhook] Order not found for reference:', reference);
    return ok({ received: true });
  }

  // Idempotency: already confirmed — nothing to do
  if (order.payment_status === 'paid') {
    return ok({ received: true, idempotent: true });
  }

  // Re-verify with Paystack API — never rely on webhook payload alone
  const { ok: psOk, data: psData } = await verifyTransaction(reference);
  if (!psOk) {
    console.error('[payments.webhook] Paystack verify API failed for ref:', reference);
    return serverError('Verification failed');
  }

  const txData        = psData?.data;
  const expectedKobo  = Math.round(order.fare_amount * 100);

  if (
    txData?.status   !== 'success' ||
    txData?.amount   !== expectedKobo ||
    txData?.currency !== 'NGN'
  ) {
    console.warn('[payments.webhook] Verification mismatch for ref:', reference, {
      status:  txData?.status,
      amount:  txData?.amount,
      expectedKobo,
    });
    return ok({ received: true, verified: false });
  }

  // Atomic update with idempotency guard
  const { data: updated, error: updateErr } = await admin
    .from('orders')
    .update({ payment_status: 'paid', status: 'confirmed' })
    .eq('id', order.id)
    .eq('payment_status', 'pending')
    .select('id');

  if (updateErr) {
    console.error('[payments.webhook] DB update failed:', updateErr.message);
    return serverError('DB update failed');
  }

  // 0 rows = already updated by the callback verify — still success
  if (!updated || updated.length === 0) {
    return ok({ received: true, idempotent: true });
  }

  await dispatchOrder(order.id).catch((err) => {
    console.warn('[payments.webhook] Dispatch threw:', err.message);
  });

  return ok({ received: true });
});
