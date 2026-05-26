/**
 * Structured logger for /api/* routes and server-only services.
 *
 * Emits JSON lines on stdout — your hosting platform (Vercel, Fly,
 * Render, etc.) forwards stdout to its log drain, where any APM
 * (Sentry / Datadog / BetterStack / Grafana Loki) can ingest it
 * without us coupling code to a specific vendor.
 *
 * Each log line carries:
 *   • `time` (ISO timestamp via pino default)
 *   • `level` (info, warn, error)
 *   • `requestId` (set per-request by withLogger)
 *   • `route`, `method`, `status`, `latencyMs` (also from withLogger)
 *   • `userId` if the request was authenticated
 *   • plus any extra fields the handler logs explicitly
 *
 * In development we pretty-print to a human-friendly format if
 * pino-pretty is installed; otherwise we fall back to raw JSON.
 */
import 'server-only';

import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: {
    // Identifying fields that show up on every log line. Add anything
    // that's constant for the runtime instance here so we don't have
    // to repeat it in callers.
    service: 'goswift-web',
    env:     process.env.NODE_ENV ?? 'development',
  },
  // ISO-8601 timestamps so log aggregators sort correctly across
  // services/regions without per-vendor format quirks.
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  // Redact common secrets from logged objects. The list is intentionally
  // narrow — pino redact is path-based, not deep-scan, so we hit only
  // the field names we actually use.
  redact: {
    paths: [
      'access_token', '*.access_token',
      'refresh_token', '*.refresh_token',
      'authorization', '*.authorization',
      'password', '*.password',
      'code', '*.code',          // OTP codes
      'Idempotency-Key', '*.Idempotency-Key',
    ],
    censor: '[REDACTED]',
  },
});
