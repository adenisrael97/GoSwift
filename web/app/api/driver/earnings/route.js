import { requireDriver }   from '@/lib/server/driverGuard';
import { ok, serverError } from '@/lib/api/response';
import { withLogger }      from '@/lib/api/withLogger';
import { aggregateEarnings, earningsBoundaries } from '@/lib/server/earnings';

export const GET = withLogger('driver.earnings.get', async (request) => {
  const { user, supabase, errorResponse } = await requireDriver(request);
  if (errorResponse) return errorResponse;

  try {
    const { startOfMonth } = earningsBoundaries();

    // Single query bounded to the current month. The RLS policy on
    // orders enforces ownership; we still filter explicitly so the
    // planner picks the (driver_id, status) index.
    const { data, error } = await supabase
      .from('orders')
      .select('fare_amount, created_at')
      .eq('driver_id', user.id)
      .eq('status', 'delivered')
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ok(aggregateEarnings(data ?? []));
  } catch (err) {
    console.error('[GET /api/driver/earnings]', err);
    return serverError();
  }
});
