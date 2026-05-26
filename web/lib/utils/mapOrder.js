import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { VEHICLE_LABELS, VEHICLE_EMOJIS } from '@/lib/utils/order';

export const ACTIVE_STATUSES = ['confirmed', 'processing', 'in_transit'];

const PACKAGE_EMOJIS = { parcel: '📦', food: '🍔', bulky: '🪑' };
const PACKAGE_LABELS = { parcel: 'Parcel Delivery', food: 'Food Delivery', bulky: 'Bulky Item' };
const PACKAGE_CATS   = { parcel: 'Standard Parcel', food: 'Food & Beverage', bulky: 'Bulky / Furniture' };

const BASE_FARE   = 1200;
const SERVICE_FEE = 350;

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Maps a flat Supabase orders row (with optional driver join) to the
 * nested shape expected by UI components (OrderCard, ReceiptCard, DriverCard, etc.)
 */
export function mapDbOrder(row) {
  const amount      = Number(row.fare_amount) || 0;
  const distanceFee = Math.max(0, amount - BASE_FARE - SERVICE_FEE);
  const pkg         = row.package_type ?? 'parcel';

  // driver join: profiles!driver_id(full_name, phone, driver_profiles(rating, total_trips, vehicle_model))
  const driverRow = row.driver ?? null;
  const driverStats = driverRow?.driver_profiles ?? null;

  return {
    id:     row.id,
    type:   PACKAGE_LABELS[pkg] ?? 'Delivery',
    emoji:  PACKAGE_EMOJIS[pkg] ?? '📦',
    status: row.status,

    pickup:  { address: row.pickup  ?? '', subtitle: null },
    dropoff: { address: row.dropoff ?? '', subtitle: null },

    fare: formatCurrency(amount),
    date: formatRelativeTime(row.created_at),
    distance: null,

    driver: driverRow ? {
      name:    driverRow.full_name  ?? 'Driver',
      phone:   driverRow.phone      ?? null,
      rating:  driverStats?.rating      ?? 5.0,
      trips:   driverStats?.total_trips ?? 0,
      vehicle: driverStats?.vehicle_model ?? null,
    } : null,

    payment: {
      base:     formatCurrency(BASE_FARE),
      distance: formatCurrency(distanceFee),
      fee:      formatCurrency(SERVICE_FEE),
      total:    formatCurrency(amount),
      method:   capitalize(row.payment_method ?? 'card'),
      status:   row.payment_status === 'paid' ? 'Paid' : 'Pending',
    },

    package: {
      type:     PACKAGE_LABELS[pkg] ?? 'Delivery',
      category: PACKAGE_CATS[pkg]   ?? 'Standard',
      weight:   `${row.weight ?? 0} kg`,
    },

    vehicleType:  row.vehicle_type ?? 'car',
    vehicleLabel: VEHICLE_LABELS[row.vehicle_type] ?? 'Car',
    vehicleEmoji: VEHICLE_EMOJIS[row.vehicle_type] ?? '🚗',

    pin: row.pin ?? null,
    eta: null,

    receiver: {
      name:  row.receiver_name  ?? null,
      phone: row.receiver_phone ?? null,
    },
    senderPhone: row.sender_phone ?? null,

    timestamps: {
      created:   row.created_at   ?? null,
      pickedUp:  row.pickup_at    ?? null,
      delivered: row.delivered_at ?? null,
      cancelled: row.cancelled_at ?? null,
    },
  };
}
