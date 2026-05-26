import { requireDriver }  from '@/lib/server/driverGuard';
import { ok, serverError } from '@/lib/api/response';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { withLogger } from '@/lib/api/withLogger';

export const GET = withLogger('driver.dashboard.get', async (request) => {
  const { user, supabase, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  try {
    // All three queries use the user-scoped client — RLS enforces row ownership.
    // profiles: user_own_profile policy (auth.uid() = id)
    // orders:   driver_assigned_orders policy (auth.uid() = driver_id)
    const [profileResult, todayOrdersResult, recentResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, phone, driver_profiles(is_online, rating, total_trips, current_order_id)')
        .eq('id', user.id)
        .single(),

      supabase
        .from('orders')
        .select('fare_amount, status')
        .eq('driver_id', user.id)
        .gte('created_at', startOfToday()),

      supabase
        .from('orders')
        .select('id, pickup, dropoff, fare_amount, status, created_at')
        .eq('driver_id', user.id)
        .in('status', ['delivered', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const profile    = profileResult.data;
    const dp         = profile?.driver_profiles ?? {};
    const todayOrders = todayOrdersResult.data ?? [];
    const recent      = recentResult.data ?? [];

    const deliveredToday = todayOrders.filter((o) => o.status === 'delivered');
    const earningsToday  = deliveredToday.reduce((s, o) => s + (Number(o.fare_amount) || 0), 0);

    const name     = profile?.full_name ?? 'Driver';
    const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

    // Fetch the active order if the driver has one assigned.
    // maybeSingle() returns null (not an error) when the order no longer matches.
    let activeOrder = null;
    const currentOrderId = dp.current_order_id ?? null;
    if (currentOrderId) {
      const { data: ao } = await supabase
        .from('orders')
        .select('id, pickup, dropoff, status, fare_amount')
        .eq('id', currentOrderId)
        .eq('driver_id', user.id)
        .in('status', ['processing', 'in_transit'])
        .maybeSingle();
      if (ao) {
        activeOrder = {
          id:      ao.id,
          pickup:  (ao.pickup  ?? '').split(',')[0].trim(),
          dropoff: (ao.dropoff ?? '').split(',')[0].trim(),
          status:  ao.status,
          fare:    formatCurrency(Number(ao.fare_amount) || 0),
        };
      }
    }

    return ok({
      driverProfile: {
        name,
        initials,
        phone:    profile?.phone ?? null,
        isOnline: dp.is_online ?? false,
      },
      stats: {
        earningsToday,
        deliveriesToday: deliveredToday.length,
        totalTrips:      dp.total_trips ?? 0,
      },
      recentDeliveries: recent.map((o) => ({
        id:     o.id,
        route:  `${(o.pickup  ?? '').split(',')[0]} → ${(o.dropoff ?? '').split(',')[0]}`,
        amount: formatCurrency(Number(o.fare_amount) || 0),
        time:   formatRelativeTime(o.created_at),
        status: o.status,
      })),
      activeOrder,
    });
  } catch (err) {
    console.error('driver/dashboard error:', err);
    return serverError();
  }
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
