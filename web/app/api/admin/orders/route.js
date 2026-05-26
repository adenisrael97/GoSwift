import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError } from '@/lib/api/response';
import { validateQuery }   from '@/lib/api/validate';
import { PaginationSchema } from '@/lib/api/schemas/admin';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { withLogger } from '@/lib/api/withLogger';

export const GET = withLogger('admin.orders.get', async (request) => {
  const { user, errorResponse } = await requireAdmin(request);
  if (errorResponse) {
    console.warn('[GET /api/admin/orders] requireAdmin failed:', errorResponse.status);
    return errorResponse;
  }

  const { data: query, errorResponse: queryErr } = validateQuery(request, PaginationSchema);
  if (queryErr) return queryErr;
  const { page, limit } = query;

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  const { data, error, count } = await getAdminSupabase()
    .from('orders')
    .select(`
      id, pickup, dropoff, status, fare_amount, payment_method, payment_status, created_at,
      customer:profiles!orders_user_id_fkey ( full_name, phone ),
      driver:profiles!orders_driver_id_fkey ( full_name, phone )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[GET /api/admin/orders] Query failed for user', user?.id, ':', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return serverError('Failed to fetch orders');
  }

  const orders = (data ?? []).map((row) => ({
    id:            row.id,
    customer:      row.customer?.full_name ?? 'Unknown',
    customerPhone: row.customer?.phone     ?? '',
    route:         `${row.pickup ?? ''} → ${row.dropoff ?? ''}`,
    status:        row.status,
    driver:        row.driver?.full_name   ?? 'Unassigned',
    fare:          formatCurrency(row.fare_amount),
    time:          formatRelativeTime(row.created_at),
  }));

  return ok({
    orders,
    pagination: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
});
