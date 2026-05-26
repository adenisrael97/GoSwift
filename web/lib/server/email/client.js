/**
 * Server-side Resend client.
 *
 * Uses RESEND_API_KEY — a secret. ONLY import this from server code
 * (API routes, server actions). NEVER expose the key to the browser;
 * it is intentionally not prefixed NEXT_PUBLIC_.
 *
 * Returns null when the key is absent so local dev (and any deploy
 * without email configured) keeps working — callers treat a null
 * client as "email disabled" and no-op with a warning.
 */
import 'server-only';

import { Resend } from 'resend';

let _client = null;

export function getResend() {
  if (_client) return _client;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  _client = new Resend(apiKey);
  return _client;
}
