/**
 * Consistent API response helpers.
 *
 * All API routes return JSON in one of two shapes:
 *   Success:  { ...data }
 *   Error:    { error: string }
 *
 * Using these helpers ensures every route follows that contract
 * and makes client-side error handling predictable.
 */

import { NextResponse } from 'next/server';

export const ok           = (data) => NextResponse.json(data, { status: 200 });
export const created      = (data) => NextResponse.json(data, { status: 201 });
export const badRequest   = (msg) => NextResponse.json({ error: msg }, { status: 400 });
export const unauthorized = (msg = 'Unauthorized') => NextResponse.json({ error: msg }, { status: 401 });
export const forbidden    = (msg = 'Forbidden') => NextResponse.json({ error: msg }, { status: 403 });
export const notFound     = (msg = 'Not found') => NextResponse.json({ error: msg }, { status: 404 });
export const conflict     = (msg = 'Conflict')  => NextResponse.json({ error: msg }, { status: 409 });
export const serverError  = (msg = 'Internal server error') => NextResponse.json({ error: msg }, { status: 500 });
