/**
 * /admin/orders — all-orders dashboard (Server Component).
 *
 * Server fetches the current page; AdminOrdersTable handles the
 * interactive bits (tabs, search, COLUMNS render callbacks) and the
 * URL-driven pagination.
 */
import { requireAuthRSC }      from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase }    from '@/lib/server/supabase.admin';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';

import DashboardLayout  from '@/components/shared/DashboardLayout';
import PageHeader       from '@/components/shared/PageHeader';
import AdminOrdersTable from '@/components/admin/AdminOrdersTable';

const PAGE_LIMIT = 20;

/**
 * @param {{ searchParams: Promise<{ page?: string }> }} props
 */
export default async function AdminOrdersPage({ searchParams }) {
  await requireAuthRSC({ allowedRoles: ['admin'] });

  const { page: pageParam } = await searchParams;
  const page  = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const limit = PAGE_LIMIT;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const { data: rows, count } = await getAdminSupabase()
    .from('orders')
    .select(`
      id, pickup, dropoff, status, fare_amount, payment_method, payment_status, created_at,
      customer:profiles!orders_user_id_fkey ( full_name, phone ),
      driver:profiles!orders_driver_id_fkey ( full_name, phone )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const orders = (rows ?? []).map((row) => ({
    id:            row.id,
    customer:      row.customer?.full_name ?? 'Unknown',
    customerPhone: row.customer?.phone     ?? '',
    route:         `${row.pickup ?? ''} → ${row.dropoff ?? ''}`,
    status:        row.status,
    driver:        row.driver?.full_name   ?? 'Unassigned',
    fare:          formatCurrency(row.fare_amount),
    time:          formatRelativeTime(row.created_at),
  }));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="All Orders"
        subtitle={`${total.toLocaleString()} orders tracked across all zones.`}
      />

      <AdminOrdersTable orders={orders} pagination={{ page, pages, total }} />
    </DashboardLayout>
  );
}
