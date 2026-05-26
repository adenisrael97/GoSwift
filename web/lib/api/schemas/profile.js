/**
 * Zod schemas for /api/profile routes.
 *
 * All three updatable fields are optional individually, but at least
 * one must be present — otherwise the request is a no-op and we'd
 * silently write only `updated_at`, which is unhelpful.
 */
import 'server-only';

import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'must be a non-empty string').max(100).optional(),
  email:     z.string().trim().max(254).optional().nullable(),
  // settings is a JSONB blob; we don't constrain its inner shape here.
  settings:  z.record(z.string(), z.unknown()).optional(),
}).refine(
  (v) => v.full_name !== undefined || v.email !== undefined || v.settings !== undefined,
  { message: 'at least one of full_name, email, settings is required' },
);
