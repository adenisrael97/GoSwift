/**
 * Smoke tests for withLogger:
 *   • Generates a request ID when the caller doesn't send one.
 *   • Echoes a caller-supplied X-Request-Id on the response.
 *   • Catches uncaught exceptions and returns a 500 with the request ID
 *     in the body (so users can quote it in bug reports).
 */
import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';

import { withLogger } from '@/lib/api/withLogger';

const HEADER = 'X-Request-Id';

function request(headers = {}) {
  return new Request('http://localhost/test', { method: 'POST', headers });
}

describe('withLogger', () => {
  it('generates an X-Request-Id when caller does not provide one', async () => {
    const handler = withLogger('test.generate', async () => NextResponse.json({ ok: true }));
    const res = await handler(request());
    const id = res.headers.get(HEADER);
    expect(id).toBeTruthy();
    expect(id?.length).toBeGreaterThanOrEqual(8);
  });

  it('echoes a caller-supplied X-Request-Id on the response', async () => {
    const handler = withLogger('test.echo', async () => NextResponse.json({ ok: true }));
    const res = await handler(request({ [HEADER]: 'caller-supplied-42' }));
    expect(res.headers.get(HEADER)).toBe('caller-supplied-42');
  });

  it('returns 500 + request ID when the handler throws', async () => {
    const handler = withLogger('test.boom', async () => {
      throw new Error('boom');
    });
    const res = await handler(request({ [HEADER]: 'will-survive-the-throw' }));
    expect(res.status).toBe(500);
    expect(res.headers.get(HEADER)).toBe('will-survive-the-throw');
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
    expect(body.requestId).toBe('will-survive-the-throw');
  });

  it('preserves the handler return value otherwise (200, JSON shape)', async () => {
    const handler = withLogger('test.passthrough', async () =>
      NextResponse.json({ hello: 'world' }, { status: 201 }),
    );
    const res = await handler(request());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ hello: 'world' });
  });
});
