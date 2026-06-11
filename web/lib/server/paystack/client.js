/**
 * Server-only Paystack API client.
 *
 * Never import this from client components or pages — it reads
 * PAYSTACK_SECRET_KEY which must never reach the browser.
 *
 * All amounts are in Kobo (1 NGN = 100 Kobo).
 */
import 'server-only';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('[Paystack] PAYSTACK_SECRET_KEY env var is not set');
  return key;
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown }} [opts]
 */
async function paystackFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

/**
 * Initialize a Paystack transaction.
 *
 * @param {{ email: string, amountKobo: number, reference: string, metadata: object, callbackUrl: string }} params
 * @returns {Promise<{ ok: boolean, status: number, data: object|null }>}
 */
export async function initializeTransaction({ email, amountKobo, reference, metadata, callbackUrl }) {
  return paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: {
      email,
      amount:       amountKobo,
      reference,
      metadata,
      callback_url: callbackUrl,
      currency:     'NGN',
    },
  });
}

/**
 * Verify a Paystack transaction by its reference.
 * Always call this server-side — never trust frontend-reported status.
 *
 * @param {string} reference
 * @returns {Promise<{ ok: boolean, status: number, data: object|null }>}
 */
export async function verifyTransaction(reference) {
  return paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/**
 * Verify the x-paystack-signature header on an incoming webhook request.
 *
 * Paystack signs the raw JSON body with HMAC-SHA512 using the secret key.
 * Uses Web Crypto (crypto.subtle) for constant-time comparison to prevent
 * timing attacks.
 *
 * @param {string} rawBody     Raw request body as a string.
 * @param {string} signatureHex  Value of x-paystack-signature header (lowercase hex).
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(rawBody, signatureHex) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: { name: 'SHA-512' } },
      false,
      ['verify'],
    );

    // Convert hex signature to bytes
    const sigBytes  = new Uint8Array(signatureHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
    const bodyBytes = new TextEncoder().encode(rawBody);

    return await crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes);
  } catch {
    return false;
  }
}
