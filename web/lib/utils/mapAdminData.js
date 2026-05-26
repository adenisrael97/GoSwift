import { formatRelativeTime } from '@/lib/utils/format';

const AVATAR_CLASSES = [
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
];

function getInitials(name) {
  if (!name) return '??';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarClass(name, index = 0) {
  const idx = name ? (name.charCodeAt(0) + index) % AVATAR_CLASSES.length : 0;
  return AVATAR_CLASSES[idx];
}

/**
 * Maps a DB driver_applications row to the shape expected by
 * ApplicationDetails and ApplicationList components.
 */
export function mapDbApplication(row, index = 0) {
  return {
    id:          row.id,
    name:        row.full_name   ?? 'Unknown',
    initials:    getInitials(row.full_name),
    avatarColor: getAvatarClass(row.full_name, index),
    email:       row.email       ?? '',
    phone:       row.phone       ?? '',
    address:     row.address     ?? '',
    nin:         row.nin         ?? '',
    dateOfBirth: row.date_of_birth ?? '',
    gender:      row.gender      ?? '',
    state:       row.state       ?? '',
    status:      row.status,
    submittedAt: formatRelativeTime(row.submitted_at),
    vehicle: {
      type:         row.vehicle_type  ?? '',
      model:        row.vehicle_model ?? '',
      plateNumber:  row.plate_number  ?? '',
      manufacturer: row.manufacturer  ?? '',
      color:        row.vehicle_color ?? '',
    },
    guarantor: {
      // Schema (migration 006) only exposes name + phone. The other
      // fields referenced earlier (email, role, verified) never existed
      // and always fell through to defaults.
      name:  row.guarantor_name  ?? '',
      phone: row.guarantor_phone ?? '',
    },
  };
}
