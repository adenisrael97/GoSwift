/**
 * Zod schemas for /api/auth/* routes (email/phone + password auth).
 *
 * The client forms normalise input before submitting (email lowercased,
 * phone built to E.164 via buildE164), so these schemas re-assert the
 * same rules at the API boundary — malformed input is rejected before it
 * reaches Supabase.
 */
import 'server-only';

import { z } from 'zod';

// E.164: + followed by 8–15 digits. Mirrors E164_REGEX in lib/utils/validation.js.
const PhoneE164 = z.string().trim().regex(
  /^\+\d{8,15}$/,
  'must be in E.164 format (e.g. +2348012345678)',
);

// Mirrors EMAIL_REGEX in lib/utils/validation.js. toLowerCase() normalises
// before the regex check so the API and the unique index agree on casing.
const Email = z.string().trim().toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address')
  .max(254, 'Email is too long');

// bcrypt truncates past 72 bytes — cap here so a long password isn't
// silently matched on a prefix. Min 8 mirrors validatePassword().
const Password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');

const FullName = z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long');

export const RegisterSchema = z.object({
  fullName: FullName,
  email:    Email,
  phone:    PhoneE164,
  password: Password,
});

// Login accepts a single identifier (email OR E.164 phone). The server
// classifies it via classifyIdentifier() and resolves phone → email.
export const LoginSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone is required').max(254),
  password:   z.string().min(1, 'Password is required').max(72),
});

export const ForgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone is required').max(254),
});
