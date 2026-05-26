/**
 * Vehicle type definitions, default pricing, and fare calculation.
 *
 * Pricing model (MVP): each vehicle has its own baseFare + perKg rate, set by
 * admin in /admin/settings and persisted in admin_settings.pricing.vehicles.
 * The defaults below are seeded into admin_settings on first migration and
 * used as fallback when the admin API is unreachable.
 */

export const VEHICLE_RATES = {
  bike: {
    label:     'Bike',
    emoji:     '🏍️',
    maxWeight: 10,
    hint:      'Small items, documents, food',
  },
  tricycle: {
    label:     'Tricycle',
    emoji:     '🛺',
    maxWeight: 25,
    hint:      'Medium loads, short city runs',
  },
  car: {
    label:     'Car',
    emoji:     '🚗',
    maxWeight: 30,
    hint:      'Standard parcels, everyday items',
  },
  pickup: {
    label:     'Pickup',
    emoji:     '🚚',
    maxWeight: 150,
    hint:      'Furniture, appliances, bulky goods',
  },
  truck: {
    label:     'Truck',
    emoji:     '🚛',
    maxWeight: 5000,
    hint:      'Heavy loads, bulk goods, large moves',
  },
};

export const VEHICLE_IDS = ['bike', 'tricycle', 'car', 'pickup', 'truck'];

/** Vehicles offered on the "Request a Vehicle" picker — bike has its own dashboard entry. */
export const REQUEST_VEHICLE_IDS = ['tricycle', 'car', 'pickup', 'truck'];

/**
 * Default per-vehicle pricing. Admin can override any of these via
 * /admin/settings → "Vehicle Pricing". All amounts in Naira.
 */
export const DEFAULT_VEHICLE_PRICING = {
  bike:     { baseFare: 1500, perKg: 90  },
  tricycle: { baseFare: 2200, perKg: 110 },
  car:      { baseFare: 2500, perKg: 120 },
  pickup:   { baseFare: 5000, perKg: 80  },
  truck:    { baseFare: 9000, perKg: 40  },
};

/**
 * Compute fare for one vehicle. Returns whole Naira.
 *
 * @param {string} vehicleId
 * @param {number} weight                       kg
 * @param {Record<string, {baseFare:number, perKg:number}>} [pricing] admin map; falls back to defaults
 */
export function computeFare(vehicleId, weight, pricing = DEFAULT_VEHICLE_PRICING) {
  const rate = pricing[vehicleId] ?? DEFAULT_VEHICLE_PRICING[vehicleId] ?? DEFAULT_VEHICLE_PRICING.car;
  const base = Number(rate.baseFare) || 0;
  const per  = Number(rate.perKg)    || 0;
  const w    = Number(weight)        || 0;
  return Math.round(base + per * w);
}

/**
 * Legacy per-vehicle multipliers. Used by the mobile app (Expo) which runs
 * in offline mock mode and computes its own subtotal from local constants
 * (BASE_FARE + weight × PER_KG_FEE + SERVICE_FEE) before scaling. The web
 * app uses computeFare() with admin-configured per-vehicle pricing instead.
 *
 * Keep both paths until the mobile flow is wired to the admin pricing API.
 */
export const VEHICLE_MULTIPLIERS = {
  bike:     0.7,
  tricycle: 0.85,
  car:      1.0,
  pickup:   1.5,
  truck:    2.2,
};

/** Scales a fare subtotal by the per-vehicle multiplier. Rounds to whole Naira. */
export function applyVehicleRate(subtotal, vehicleId) {
  const m = VEHICLE_MULTIPLIERS[vehicleId] ?? VEHICLE_MULTIPLIERS.car;
  return Math.round((Number(subtotal) || 0) * m);
}
