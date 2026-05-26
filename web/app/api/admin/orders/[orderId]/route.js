import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, notFound, serverError } from '@/lib/api/response';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { withLogger } from '@/lib/api/withLogger';

/**
 * GET /api/admin/orders/[orderId]
 *
 * Returns a single order with full customer and driver details.
 * Used by the admin order detail page (replaces the previous mock data lookup).
 */
export const GET = withLogger('admin.orders.get', async (request, { params }) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { orderId } = await params;

  const { data, error } = await getAdminSupabase()
    .from('orders')
    .select(`
      id, pickup, dropoff, package_type, weight, note,
      fare_amount, payment_method, payment_status,
      status, driver_id,
      accepted_at, pickup_at, delivered_at, eta, created_at,
      sender_phone, receiver_name, receiver_phone,
      customer:profiles!orders_user_id_fkey ( full_name, phone ),
      driver:profiles!orders_driver_id_fkey (
        full_name, phone,
        driver_profiles ( vehicle_model, vehicle_type, vehicle_color, plate_number, rating, total_trips )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !data) return notFound('Order not found');

  const driverStats = data.driver?.driver_profiles ?? null;
  const driverName  = data.driver?.full_name ?? null;

  return ok({
    order: {
      id:            data.id,
      status:        data.status,
      createdAt:     data.created_at,
      placedAt:      formatRelativeTime(data.created_at),
      acceptedAt:    data.accepted_at ?? null,
      pickupAt:      data.pickup_at   ?? null,
      deliveredAt:   data.delivered_at ?? null,
      eta:           data.eta          ?? null,

      pickup:        data.pickup  ?? '',
      dropoff:       data.dropoff ?? '',
      route:         `${data.pickup ?? ''} → ${data.dropoff ?? ''}`,

      package: {
        type:   data.package_type ?? 'parcel',
        weight: `${data.weight ?? 0} kg`,
        note:   data.note ?? null,
      },

      fare:    formatCurrency(Number(data.fare_amount) || 0),
      fareRaw: Number(data.fare_amount) || 0,

      payment: {
        method: data.payment_method ?? 'cash',
        status: data.payment_status === 'paid' ? 'Paid' : 'Pending',
      },

      customer: {
        name:  data.customer?.full_name ?? 'Unknown',
        phone: data.customer?.phone     ?? '',
        initials: (data.customer?.full_name ?? 'U')
          .trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      },

      sender: {
        phone: data.sender_phone ?? null,
      },

      receiver: {
        name:  data.receiver_name ?? 'Unknown',
        phone: data.receiver_phone ?? '',
        initials: (data.receiver_name ?? 'R')
          .trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      },

      driverId: data.driver_id ?? null,
      driver:   driverName ? {
        name:     driverName,
        phone:    data.driver?.phone ?? '',
        initials: driverName.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
        vehicle:  driverStats?.vehicle_model  ?? null,
        plate:    driverStats?.plate_number   ?? null,
        type:     driverStats?.vehicle_type   ?? null,
        rating:   driverStats?.rating         ?? null,
        trips:    driverStats?.total_trips    ?? null,
      } : null,
    },
  });
});
