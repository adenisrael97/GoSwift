/**
 * Smoke tests for the validateBody/validateQuery helpers.
 * These are the gate everything else passes through, so a regression
 * here would silently weaken every route.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { validateBody, validateQuery } from '@/lib/api/validate';

const SimpleSchema = z.object({
  name: z.string().min(1),
  age:  z.coerce.number().int().nonnegative(),
});

/** Build a tiny Request shim that `validateBody` accepts. */
function makeJsonRequest(body, { method = 'POST', url = 'http://localhost/test' } = {}) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('validateBody', () => {
  it('returns parsed data on a valid body', async () => {
    const req = makeJsonRequest({ name: 'Ada', age: 30 });
    const { data, errorResponse } = await validateBody(req, SimpleSchema);
    expect(errorResponse).toBeNull();
    expect(data).toEqual({ name: 'Ada', age: 30 });
  });

  it('returns a 400 response on schema failure', async () => {
    const req = makeJsonRequest({ name: '', age: -1 });
    const { data, errorResponse } = await validateBody(req, SimpleSchema);
    expect(data).toBeNull();
    expect(errorResponse?.status).toBe(400);
    const body = await errorResponse.json();
    expect(body.error).toMatch(/name|age/);
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('returns a 400 response on malformed JSON', async () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    });
    const { errorResponse } = await validateBody(req, SimpleSchema);
    expect(errorResponse?.status).toBe(400);
    const body = await errorResponse.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('coerces numeric strings via schema rules', async () => {
    const req = makeJsonRequest({ name: 'Ada', age: '42' });
    const { data, errorResponse } = await validateBody(req, SimpleSchema);
    expect(errorResponse).toBeNull();
    expect(data?.age).toBe(42);
  });
});

describe('validateQuery', () => {
  const QSchema = z.object({
    page:  z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });

  it('parses ?page=2&limit=50', () => {
    const req = new Request('http://localhost/test?page=2&limit=50');
    const { data, errorResponse } = validateQuery(req, QSchema);
    expect(errorResponse).toBeNull();
    expect(data).toEqual({ page: 2, limit: 50 });
  });

  it('applies defaults when params are absent', () => {
    const req = new Request('http://localhost/test');
    const { data, errorResponse } = validateQuery(req, QSchema);
    expect(errorResponse).toBeNull();
    expect(data).toEqual({ page: 1, limit: 20 });
  });

  it('rejects out-of-range limit', () => {
    const req = new Request('http://localhost/test?limit=1000');
    const { errorResponse } = validateQuery(req, QSchema);
    expect(errorResponse?.status).toBe(400);
  });
});
