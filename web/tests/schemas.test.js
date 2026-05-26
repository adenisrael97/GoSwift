/**
 * Zod schema smoke tests.
 *
 * These guard the API contract — if someone tightens or loosens a
 * field, the failing test forces them to update the schema's
 * docstring and bump the client at the same time.
 */
import { describe, it, expect } from 'vitest';

import { CreateOrderSchema, CancelOrderSchema, AdvanceOrderStatusSchema } from '@/lib/api/schemas/orders';
import { UpdateProfileSchema } from '@/lib/api/schemas/profile';
import { UpdateLocationSchema, UpdateDriverStatusSchema, ApplyDriverSchema } from '@/lib/api/schemas/drivers';
import { ReviewApplicationSchema, AssignOrderSchema } from '@/lib/api/schemas/admin';

describe('CreateOrderSchema', () => {
  const valid = {
    pickup:        '12 Broad St, Lagos',
    dropoff:       '45 Admiralty Way, Lagos',
    fareEstimate:  2500,
    paymentMethod: 'card',
    receiverName:  'Jane Doe',
    receiverPhone: '+2348012345678',
  };

  it('accepts a minimal valid payload', () => {
    const r = CreateOrderSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('coerces numeric strings for fareEstimate', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, fareEstimate: '3000' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.fareEstimate).toBe(3000);
  });

  it('rejects negative fareEstimate', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, fareEstimate: -50 });
    expect(r.success).toBe(false);
  });

  it('rejects unknown paymentMethod', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, paymentMethod: 'crypto' });
    expect(r.success).toBe(false);
  });

  it('rejects pickup over 300 chars', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, pickup: 'x'.repeat(301) });
    expect(r.success).toBe(false);
  });

  it('rejects partial pickup coords (lat without lng)', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, pickupLat: 6.5 });
    expect(r.success).toBe(false);
  });

  it('accepts both pickup coords together', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, pickupLat: 6.5, pickupLng: 3.4 });
    expect(r.success).toBe(true);
  });

  it('rejects invalid latitude range', () => {
    const r = CreateOrderSchema.safeParse({ ...valid, pickupLat: 100, pickupLng: 3.4 });
    expect(r.success).toBe(false);
  });
});

describe('CancelOrderSchema', () => {
  it('accepts empty body', () => {
    expect(CancelOrderSchema.safeParse({}).success).toBe(true);
  });

  it('accepts null reason', () => {
    expect(CancelOrderSchema.safeParse({ reason: null }).success).toBe(true);
  });

  it('rejects reason over 500 chars', () => {
    const r = CancelOrderSchema.safeParse({ reason: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe('AdvanceOrderStatusSchema', () => {
  it('accepts the three transition statuses', () => {
    for (const status of ['processing', 'in_transit', 'delivered']) {
      expect(AdvanceOrderStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects "confirmed" — not a driver-controlled transition', () => {
    expect(AdvanceOrderStatusSchema.safeParse({ status: 'confirmed' }).success).toBe(false);
  });
});

describe('UpdateProfileSchema', () => {
  it('accepts a single full_name update', () => {
    expect(UpdateProfileSchema.safeParse({ full_name: 'Ada Lovelace' }).success).toBe(true);
  });

  it('rejects empty body — must update something', () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty full_name', () => {
    expect(UpdateProfileSchema.safeParse({ full_name: '   ' }).success).toBe(false);
  });
});

describe('UpdateLocationSchema', () => {
  it('accepts valid lat/lng', () => {
    expect(UpdateLocationSchema.safeParse({ lat: 6.5, lng: 3.4 }).success).toBe(true);
  });

  it('coerces numeric strings', () => {
    const r = UpdateLocationSchema.safeParse({ lat: '6.5', lng: '3.4' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.lat).toBe(6.5);
  });

  it('rejects out-of-range lat', () => {
    expect(UpdateLocationSchema.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
  });
});

describe('UpdateDriverStatusSchema', () => {
  it('accepts boolean isOnline', () => {
    expect(UpdateDriverStatusSchema.safeParse({ isOnline: true }).success).toBe(true);
    expect(UpdateDriverStatusSchema.safeParse({ isOnline: false }).success).toBe(true);
  });

  it('rejects string "true"', () => {
    expect(UpdateDriverStatusSchema.safeParse({ isOnline: 'true' }).success).toBe(false);
  });
});

describe('ApplyDriverSchema', () => {
  const valid = {
    fullName:    'Ada Lovelace',
    phone:       '+2348012345678',
    vehicleType: 'bike',
    plateNumber: 'ABC123XY',
  };

  it('accepts the minimal required fields', () => {
    expect(ApplyDriverSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing vehicleType', () => {
    const { vehicleType, ...rest } = valid;
    expect(ApplyDriverSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects unknown vehicleType', () => {
    expect(ApplyDriverSchema.safeParse({ ...valid, vehicleType: 'jet' }).success).toBe(false);
  });
});

describe('ReviewApplicationSchema', () => {
  it('accepts approved/rejected', () => {
    expect(ReviewApplicationSchema.safeParse({ decision: 'approved' }).success).toBe(true);
    expect(ReviewApplicationSchema.safeParse({ decision: 'rejected' }).success).toBe(true);
  });

  it('rejects "maybe"', () => {
    expect(ReviewApplicationSchema.safeParse({ decision: 'maybe' }).success).toBe(false);
  });
});

describe('AssignOrderSchema', () => {
  it('accepts a UUID', () => {
    const r = AssignOrderSchema.safeParse({ driverId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(r.success).toBe(true);
  });

  it('rejects non-UUID', () => {
    expect(AssignOrderSchema.safeParse({ driverId: 'abc' }).success).toBe(false);
  });
});

