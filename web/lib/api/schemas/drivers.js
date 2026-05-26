/**
 * Zod schemas for /api/driver/* routes.
 */
import 'server-only';

import { z } from 'zod';

const VehicleType = z.enum(['bike', 'tricycle', 'car', 'pickup', 'truck']);

/** POST /api/driver/apply — most fields optional, the required ones are guard rails for the dispatch system. */
export const ApplyDriverSchema = z.object({
  fullName:       z.string().trim().min(1, 'is required').max(100),
  phone:          z.string().trim().min(1, 'is required').max(20),
  email:          z.string().trim().max(254).optional().nullable(),
  dateOfBirth:    z.string().trim().max(20).optional().nullable(),
  gender:         z.string().trim().max(20).optional().nullable(),
  nin:            z.string().trim().max(20, 'NIN must be 11 numbers (e.g. 12345678901)').optional().nullable(),
  address:        z.string().trim().max(300).optional().nullable(),
  state:          z.string().trim().max(50).optional().nullable(),
  vehicleType:    VehicleType,
  vehicleModel:   z.string().trim().max(100).optional().nullable(),
  plateNumber:    z.string().trim().min(1, 'is required').max(20),
  manufacturer:   z.string().trim().max(100).optional().nullable(),
  vehicleColor:   z.string().trim().max(50).optional().nullable(),
  guarantorName:  z.string().trim().max(100).optional().nullable(),
  guarantorPhone: z.string().trim().max(20).optional().nullable(),
});

/** PATCH /api/driver/location body. */
export const UpdateLocationSchema = z.object({
  lat: z.coerce.number().min(-90,  'must be a number in [-90, 90]').max(90),
  lng: z.coerce.number().min(-180, 'must be a number in [-180, 180]').max(180),
});

/** PATCH /api/driver/status body. */
export const UpdateDriverStatusSchema = z.object({
  isOnline: z.boolean({ message: 'isOnline must be a boolean' }),
});
