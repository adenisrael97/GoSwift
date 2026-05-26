/**
 * Zod schemas for /api/admin/* routes.
 */
import 'server-only';

import { z } from 'zod';

/**
 * Shared pagination query params for all paginated admin list routes.
 * z.coerce.number() handles the string→number conversion that
 * searchParams always returns, replacing the manual parseInt + Math.min/max
 * pattern that each route previously duplicated.
 */
export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Applications list — extends pagination with an optional status filter.
 * Replaces the manual VALID_STATUSES Set check in the route handler.
 */
export const ApplicationsQuerySchema = PaginationSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

/** PATCH /api/admin/settings — accepts any JSON object; inner shape is settings-team's contract. */
export const UpdateAdminSettingsSchema = z.record(z.string(), z.unknown());

/** POST /api/admin/applications/[id]/review */
export const ReviewApplicationSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes:    z.string().trim().max(2000).optional().nullable(),
});

/** POST /api/admin/orders/[id]/assign */
export const AssignOrderSchema = z.object({
  driverId: z.string().uuid('must be a valid UUID'),
});
