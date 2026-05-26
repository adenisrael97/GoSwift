import { requireDriver }   from '@/lib/server/driverGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, badRequest, serverError } from '@/lib/api/response';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { withLogger } from '@/lib/api/withLogger';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

export const GET = withLogger('driver.orders.get', async (request) => {
  const { user, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)));

  if (isNaN(page) || isNaN(limit)) return badRequest('page and limit must be integers');

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  // Admin client is required only because the customer name join
  // (profiles!user_id) reads a row the driver does not own under RLS.
  // Role is already verified by requireDriver() above.
  const { data: orders, error, count } = await getAdminSupabase()
    .from('orders')
    .select(
      'id, pickup, dropoff, fare_amount, status, created_at, weight, package_type, vehicle_type, customer:profiles!orders_user_id_fkey(full_name)',
      { count: 'exact' }
    )
    .eq('driver_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[GET /api/driver/orders]', error.message);
    return serverError('Failed to fetch orders');
  }

  const mapped = (orders ?? []).map((o) => ({
    id:       o.id,
    customer: o.customer?.full_name ?? 'Customer',
    pickup:   o.pickup  ?? '',
    dropoff:  o.dropoff ?? '',
    distance: '—',
    fare:     formatCurrency(Number(o.fare_amount) || 0),
    status:   o.status,
    date:     formatRelativeTime(o.created_at),
    package: {
      type:        o.package_type  ?? 'parcel',
      weight:      `${o.weight ?? 0} kg`,
      vehicleType: o.vehicle_type  ?? 'car',
    },
  }));

  return ok({
    orders: mapped,
    pagination: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
});
