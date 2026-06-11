/**
 * Paystack integration unit tests.
 *
 * Covers:
 *   - InitializePaymentSchema validation
 *   - verifyWebhookSignature logic
 *   - Paystack client helpers (paystackFetch behaviours are mocked at the
 *     fetch boundary since the real Paystack API is not available in CI)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InitializePaymentSchema } from '@/lib/api/schemas/payments';

// ── Schema tests ─────────────────────────────────────────────────────────────

describe('InitializePaymentSchema', () => {
  const valid = {
    pickup:        '12 Broad St, Lagos',
    dropoff:       '45 Admiralty Way, Lekki',
    fareEstimate:  2500,
    receiverName:  'Jane Doe',
    receiverPhone: '+2348012345678',
  };

  it('accepts a minimal valid payload', () => {
    expect(InitializePaymentSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults packageType to parcel when omitted', () => {
    const r = InitializePaymentSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.packageType).toBe('parcel');
  });

  it('defaults vehicleType to car when omitted', () => {
    const r = InitializePaymentSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.vehicleType).toBe('car');
  });

  it('coerces numeric string fareEstimate', () => {
    const r = InitializePaymentSchema.safeParse({ ...valid, fareEstimate: '3000' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fareEstimate).toBe(3000);
  });

  it('rejects zero fareEstimate', () => {
    expect(InitializePaymentSchema.safeParse({ ...valid, fareEstimate: 0 }).success).toBe(false);
  });

  it('rejects negative fareEstimate', () => {
    expect(InitializePaymentSchema.safeParse({ ...valid, fareEstimate: -1 }).success).toBe(false);
  });

  it('rejects missing receiverName', () => {
    const { receiverName, ...rest } = valid;
    expect(InitializePaymentSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid receiverPhone', () => {
    expect(
      InitializePaymentSchema.safeParse({ ...valid, receiverPhone: 'not-a-phone' }).success,
    ).toBe(false);
  });

  it('rejects pickup over 300 chars', () => {
    expect(
      InitializePaymentSchema.safeParse({ ...valid, pickup: 'x'.repeat(301) }).success,
    ).toBe(false);
  });

  it('rejects pickupLat without pickupLng', () => {
    expect(
      InitializePaymentSchema.safeParse({ ...valid, pickupLat: 6.5 }).success,
    ).toBe(false);
  });

  it('accepts both pickup coordinates together', () => {
    expect(
      InitializePaymentSchema.safeParse({ ...valid, pickupLat: 6.5, pickupLng: 3.4 }).success,
    ).toBe(true);
  });

  it('rejects unknown vehicleType', () => {
    expect(
      InitializePaymentSchema.safeParse({ ...valid, vehicleType: 'rocket' }).success,
    ).toBe(false);
  });
});

// ── Webhook signature tests ───────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  let verifyWebhookSignature;

  beforeEach(async () => {
    // Set the secret before each test so getSecretKey() doesn't throw.
    process.env.PAYSTACK_SECRET_KEY = 'test_secret_key_for_vitest';
    ({ verifyWebhookSignature } = await import('@/lib/server/paystack/client'));
  });

  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY;
    vi.resetModules();
  });

  it('returns true for a correctly signed payload', async () => {
    const body   = JSON.stringify({ event: 'charge.success', data: { reference: 'test-ref' } });
    const secret = 'test_secret_key_for_vitest';

    // Compute expected HMAC-SHA512 using Web Crypto (same as production code)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: { name: 'SHA-512' } },
      false,
      ['sign'],
    );
    const sigBuffer  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const sigHex     = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const result = await verifyWebhookSignature(body, sigHex);
    expect(result).toBe(true);
  });

  it('returns false for a tampered payload', async () => {
    const body      = JSON.stringify({ event: 'charge.success', data: { reference: 'real-ref' } });
    const tampered  = JSON.stringify({ event: 'charge.success', data: { reference: 'fake-ref' } });
    const secret    = 'test_secret_key_for_vitest';

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: { name: 'SHA-512' } },
      false,
      ['sign'],
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const sigHex    = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Sig computed over `body` but we verify against `tampered`
    const result = await verifyWebhookSignature(tampered, sigHex);
    expect(result).toBe(false);
  });

  it('returns false for a completely wrong signature', async () => {
    const body   = JSON.stringify({ event: 'charge.success' });
    const result = await verifyWebhookSignature(body, 'deadbeef'.repeat(16));
    expect(result).toBe(false);
  });

  it('returns false when PAYSTACK_SECRET_KEY is missing', async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const result = await verifyWebhookSignature('{"event":"charge.success"}', 'abc123');
    expect(result).toBe(false);
  });
});

// ── Paystack client — initializeTransaction ───────────────────────────────────

describe('initializeTransaction', () => {
  let initializeTransaction;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock';
    vi.resetModules();
    ({ initializeTransaction } = await import('@/lib/server/paystack/client'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.PAYSTACK_SECRET_KEY;
    vi.resetModules();
  });

  it('POSTs to /transaction/initialize with correct payload', async () => {
    const mockResponse = {
      status:  true,
      message: 'Authorization URL created',
      data:    { authorization_url: 'https://paystack.io/pay/xxx', reference: 'test-uuid' },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok:   true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await initializeTransaction({
      email:       'test@example.com',
      amountKobo:  250000,
      reference:   'test-uuid',
      metadata:    { order_id: 'test-uuid' },
      callbackUrl: 'https://myapp.com/payment/callback',
    });

    expect(result.ok).toBe(true);
    expect(result.data.data.authorization_url).toBe('https://paystack.io/pay/xxx');

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/transaction/initialize');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk_test_mock');

    const body = JSON.parse(init.body);
    expect(body.amount).toBe(250000);
    expect(body.reference).toBe('test-uuid');
    expect(body.currency).toBe('NGN');
  });

  it('returns ok:false on Paystack API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok:     false,
      status: 401,
      json:   async () => ({ status: false, message: 'Invalid key' }),
    });

    const result = await initializeTransaction({
      email: 'x@x.com', amountKobo: 100, reference: 'r', metadata: {}, callbackUrl: '/',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});

// ── Paystack client — verifyTransaction ──────────────────────────────────────

describe('verifyTransaction', () => {
  let verifyTransaction;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock';
    vi.resetModules();
    ({ verifyTransaction } = await import('@/lib/server/paystack/client'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.PAYSTACK_SECRET_KEY;
    vi.resetModules();
  });

  it('GETs /transaction/verify/:reference and returns data', async () => {
    const txData = { status: 'success', amount: 250000, currency: 'NGN', reference: 'abc-uuid' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ status: true, data: txData }),
    });

    const result = await verifyTransaction('abc-uuid');
    expect(result.ok).toBe(true);
    expect(result.data.data.status).toBe('success');

    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/transaction/verify/abc-uuid');
  });

  it('URL-encodes special characters in the reference', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ data: {} }),
    });

    await verifyTransaction('ref with spaces');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('ref%20with%20spaces');
  });

  it('returns ok:false on network-level failure response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 404, json: async () => ({ message: 'Transaction not found' }),
    });

    const result = await verifyTransaction('missing-ref');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });
});
