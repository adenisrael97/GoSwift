/**
 * Higher-order wrapper that adds structured logging, request IDs, and
 * a top-level error catch to a Next.js route handler.
 *
 * Usage:
 *   export const POST = withLogger('orders.create', async (request) => {
 *     ...
 *   });
 *
 * What you get for free:
 *   • A request ID (X-Request-Id header, generated when absent) is
 *     attached to every log line emitted during the request.
 *   • Request start, end, latency, and status are logged automatically.
 *   • Uncaught exceptions get a 500 response with the request ID so
 *     ops can grep the log line that matches the user's screenshot.
 *   • Response carries `X-Request-Id` so the client can echo it back
 *     in bug reports.
 *
 * The wrapper does NOT swallow the original return value — handlers
 * still return whatever they were returning before.
 */
import 'server-only';

import { NextResponse } from 'next/server';

import { logger } from '@/lib/server/logger';

const REQUEST_ID_HEADER = 'X-Request-Id';

function generateRequestId() {
  // Use Web Crypto when available (Node 19+, Edge runtime); fall back to
  // a timestamp+random combo for older runtimes (unlikely but cheap).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @template {(...args: any[]) => Promise<Response | NextResponse>} H
 * @param {string} routeName  Logical route name, e.g. 'orders.create'. Used as
 *                            the `route` field on every log line.
 * @param {H} handler         The actual Next.js route handler.
 * @returns {H}
 */
export function withLogger(routeName, handler) {
  // @ts-ignore — the cast back to H preserves the handler's signature.
  return async function wrappedHandler(request, ctx) {
    const t0 = Date.now();
    const requestId = request.headers.get(REQUEST_ID_HEADER) ?? generateRequestId();
    const method    = request.method;

    const reqLog = logger.child({ requestId, route: routeName, method });
    reqLog.info({ event: 'request.start' });

    /** @type {Response | NextResponse} */
    let response;
    try {
      response = await handler(request, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack   = err instanceof Error ? err.stack   : undefined;
      reqLog.error({
        event:     'request.error',
        latencyMs: Date.now() - t0,
        err:       { message, stack },
      });
      const errResp = NextResponse.json(
        {
          error:     'Internal server error',
          requestId, // surface so users can include this in bug reports
        },
        { status: 500 },
      );
      errResp.headers.set(REQUEST_ID_HEADER, requestId);
      return errResp;
    }

    // Echo the request ID back on the response so clients can capture
    // it for support tickets.
    try {
      response.headers.set(REQUEST_ID_HEADER, requestId);
    } catch {
      // Some Response objects are sealed; safe to ignore.
    }

    const latencyMs = Date.now() - t0;
    const status    = response.status;
    const logFn = status >= 500 ? reqLog.error.bind(reqLog)
                : status >= 400 ? reqLog.warn.bind(reqLog)
                :                  reqLog.info.bind(reqLog);
    logFn({ event: 'request.end', status, latencyMs });

    return response;
  };
}
