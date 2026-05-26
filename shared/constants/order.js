/**
 * Shared order-domain constants — platform-agnostic (web + mobile).
 * Centralising here prevents logic drift when business rules change.
 */

export const PACKAGE_LABELS = {
  parcel: 'Parcel',
  food:   'Food',
  bulky:  'Bulky Item',
};

export const VEHICLE_LABELS = {
  bike:     'Bike',
  tricycle: 'Tricycle',
  car:      'Car',
  pickup:   'Pickup',
  truck:    'Truck',
};

export const VEHICLE_EMOJIS = {
  bike:     '🏍️',
  tricycle: '🛺',
  car:      '🚗',
  pickup:   '🚚',
  truck:    '🚛',
};
