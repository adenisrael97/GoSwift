/**
 * Core transactional email sender.
 *
 * Every GoSwift transactional email goes through here so the "From"
 * identity, error handling, and the email-disabled fallback live in
 * exactly one place.
 *
 * Contract: sendEmail() NEVER throws and NEVER blocks the request's
 * critical path. It returns { ok: boolean } and logs failures. A mail
 * outage must never fail an order, a signup, or an approval — callers
 * fire it without awaiting (see the API routes). See CLAUDE.md §16.
 */
import 'server-only';

import { getResend } from './client';

// Single source of truth for the sender. Set EMAIL_FROM to e.g.
//   GoSwift <no-reply@goswift.app>
// so recipients see "GoSwift", never Supabase.
const FROM = process.env.EMAIL_FROM || 'GoSwift <no-reply@goswift.app>';

/**
 * @param {{ to: string, subject: string, html: string }} msg
 * @returns {Promise<{ ok: boolean }>}
 */
export async function sendEmail({ to, subject, html }) {
  if (!to) {
    console.warn('[email] skipped — no recipient address');
    return { ok: false };
  }

  const resend = getResend();
  if (!resend) {
    // No API key configured — log loudly so it's obvious in dev, but
    // don't treat it as an error that could bubble into the request.
    console.warn(`[email] RESEND_API_KEY unset — would have sent "${subject}" to ${to}`);
    return { ok: false };
  }

  // In dev, redirect all sends to a single inbox for easy testing.
  const recipient = process.env.EMAIL_DEV_OVERRIDE || to;

  try {
    const { error } = await resend.emails.send({ from: FROM, to: recipient, subject, html });
    if (error) {
      console.error(`[email] send failed for "${subject}" to ${to}:`, error.message || error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email] threw sending "${subject}" to ${to}:`, err.message);
    return { ok: false };
  }
}
