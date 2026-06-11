/**
 * Zod schemas for the Paystack payment routes.
 *
 * InitializePaymentSchema mirrors CreateOrderSchema minus paymentMethod
 * (card is the only method routed through Paystack).
 */
import 'server-only';

import { z } from 'zod';

const Lat = z.coerce.number().min(-90).max(90);
const Lng = z.coerce.number().min(-180).max(180);

const PhoneE164ish = z.string().trim().regex(
  /^\+?[\d\s\-]{7,15}$/,
  'must be a valid phone number',
);

/** POST /api/payments/initialize body. */
export const InitializePaymentSchema = z.object({
  pickup:       z.string().trim().min(1, 'is required').max(300),
  pickupLat:    Lat.optional().nullable(),
  pickupLng:    Lng.optional().nullable(),
  dropoff:      z.string().trim().min(1, 'is required').max(300),
  dropoffLat:   Lat.optional().nullable(),
  dropoffLng:   Lng.optional().nullable(),
  packageType:  z.enum(['parcel', 'food', 'bulky']).optional().default('parcel'),
  vehicleType:  z.enum(['bike', 'tricycle', 'car', 'pickup', 'truck']).optional().default('car'),
  weight:       z.coerce.number().nonnegative().optional().default(0),
  note:         z.string().trim().max(500).optional().nullable(),
  fareEstimate: z.coerce.number().positive('must be a positive number'),
  senderPhone:  PhoneE164ish.optional().nullable(),
  receiverName: z.string().trim().min(1, 'is required').max(120),
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
