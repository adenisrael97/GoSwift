/**
 * Zod schemas for customer + driver order routes.
 *
 * Co-located here so every API route hits the same source of truth.
 * Schema docstrings encode the contract — what the request must look
 * like — without us having to maintain a separate API document.
 */
import 'server-only';

import { z } from 'zod';

// ── Shared building blocks ───────────────────────────────────────────

const Lat = z.coerce.number().min(-90).max(90);
const Lng = z.coerce.number().min(-180).max(180);

const PhoneE164ish = z.string().trim().regex(
  /^\+?[\d\s\-]{7,15}$/,
  'must be a valid phone number',
);

const PackageType = z.enum(['parcel', 'food', 'bulky']);
const VehicleType = z.enum(['bike', 'tricycle', 'car', 'pickup', 'truck']);
const PaymentMethod = z.enum(['card', 'cash', 'transfer']);

// ── Customer-side schemas ────────────────────────────────────────────

/** POST /api/orders body. */
export const CreateOrderSchema = z.object({
  pickup:       z.string().trim().min(1, 'is required').max(300),
  pickupLat:    Lat.optional().nullable(),
  pickupLng:    Lng.optional().nullable(),
  dropoff:      z.string().trim().min(1, 'is required').max(300),
  dropoffLat:   Lat.optional().nullable(),
  dropoffLng:   Lng.optional().nullable(),
  packageType:  PackageType.optional().default('parcel'),
  vehicleType:  VehicleType.optional().default('car'),
  weight:       z.coerce.number().nonnegative().optional().default(0),
  note:         z.string().trim().max(500).optional().nullable(),
  fareEstimate: z.coerce.number().positive('must be a positive number'),
  paymentMethod: PaymentMethod,
  senderPhone:   PhoneE164ish.optional().nullable(),
  receiverName:  z.string().trim().min(1, 'is required').max(120),
  receiverPhone: PhoneE164ish,
}).refine(
  (v) =>
    (v.pickupLat == null && v.pickupLng == null) ||
    (v.pickupLat != null && v.pickupLng != null),
  { message: 'pickupLat and pickupLng must both be set or both omitted', path: ['pickupLat'] },
).refine(
  (v) =>
    (v.dropoffLat == null && v.dropoffLng == null) ||
    (v.dropoffLat != null && v.dropoffLng != null),
  { message: 'dropoffLat and dropoffLng must both be set or both omitted', path: ['dropoffLat'] },
);

/** POST /api/orders/[id]/cancel body — reason is optional. */
export const CancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

/** POST /api/driver/orders/[id]/release body — reason is optional. */
export const ReleaseOrderSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

/**
 * PATCH /api/orders/[id]/status body.
 * Drivers can only move forward through pickup → in_transit → delivered.
 * The server-side state machine enforces transitions; this validates shape.
 */
export const AdvanceOrderStatusSchema = z.object({
  status: z.enum(['processing', 'in_transit', 'delivered']),
});
