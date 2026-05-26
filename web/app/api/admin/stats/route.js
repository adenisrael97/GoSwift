import { requireAdmin }  from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError } from '@/lib/api/response';
import { formatCurrency }  from '@/lib/utils/format';
import { withLogger } from '@/lib/api/withLogger';

const ACTIVE_STATUSES = ['confirmed', 'processing', 'in_transit'];

export const GET = withLogger('admin.stats.get', async (request) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const admin = getAdminSupabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  try {
    const [ordersToday, activeOrders, driversOnline, revenue] = await Promise.all([
      admin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
      admin.from('orders').select('id', { count: 'exact', head: true }).in('status', ACTIVE_STATUSES),
      admin.from('driver_profiles').select('id', { count: 'exact', head: true }).eq('is_online', true),
      admin.from('orders').select('fare_amount').gte('created_at', todayIso).eq('payment_status', 'paid'),
    ]);

    const revenueTotal = (revenue.data ?? []).reduce((s, r) => s + Number(r.fare_amount), 0);

    return ok({
      stats: [
        {
          id: 'orders_today',
          label: 'Orders Today',
          value: String(ordersToday.count ?? 0),
          icon: 'shopping-cart',
          badge: { label: 'Today', variant: 'neutral' },
        },
        {
          id: 'active_orders',
          label: 'Active Orders',
          value: String(activeOrders.count ?? 0),
          icon: 'radar',
          badge: { label: 'Live', variant: 'live' },
        },
        {
          id: 'drivers_online',
          label: 'Drivers Online',
          value: String(driversOnline.count ?? 0),
          icon: 'users',
          badge: { label: 'Right now', variant: 'neutral' },
        },
        {
          id: 'revenue',
          label: 'Revenue Today',
          value: formatCurrency(revenueTotal),
          icon: 'banknote',
          badge: { label: 'Paid orders', variant: 'success' },
        },
      ],
    });
  } catch (err) {
    console.error('[GET /api/admin/stats]', err.message);
    return serverError('Failed to fetch stats');
  }
});
