/**
 * Payments API — Paystack integration helpers for client-side code.
 *
 * initializePayment  — POST /api/payments/initialize
 *   Creates a pending order + Paystack transaction.
 *   Returns { orderId, authorizationUrl, reference }.
 *   Caller should redirect the browser to authorizationUrl.
 *
 * verifyPayment  — POST /api/payments/verify
 *   Called from the callback page after Paystack redirects back.
 *   Verifies the transaction server-side and updates order status.
 *   Returns { success, orderId }.
 *
 * Both helpers follow the same { ok, status, body } envelope as
 * authedFetch so callers branch on `!ok` and surface `body.error`.
 */
import { authedFetch } from './client';

/**
 * Initialise a Paystack card payment for the given order payload.
 *
 * @param {object} payload  Same fields as CreateOrderSchema minus paymentMethod.
 * @returns {Promise<{ ok: boolean, status: number, body: object }>}
 */
export function initializePayment(payload) {
  return authedFetch('/api/payments/initialize', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

/**
 * Verify a Paystack transaction after the browser returns from Paystack.
 *
 * @param {string} reference  Order UUID (used as the Paystack reference).
 * @returns {Promise<{ ok: boolean, status: number, body: object }>}
 */
export function verifyPayment(reference) {
  return authedFetch('/api/payments/verify', {
    method: 'POST',
    body:   JSON.stringify({ reference }),
  });
}
