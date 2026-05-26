/**
 * /driver/orders — driver's order history (Server Component).
 *
 * Page shell (title, subtitle stats) renders server-side with the first
 * page of orders inlined. The interactive bits (search input, tab
 * toggle, table render callbacks) live in DriverOrdersTable as a
 * client island.
 *
 * Pagination is server-side via ?page=N — clicking next/prev triggers a
 * Server Component re-render with the next slice, no extra fetch.
 */
import { requireAuthRSC }   from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';

import DashboardLayout    from '@/components/shared/DashboardLayout';
import PageHeader         from '@/components/shared/PageHeader';
import DriverOrdersTable  from '@/components/driver/DriverOrdersTable';

const PAGE_LIMIT = 20;

/**
 * @param {{ searchParams: Promise<{ page?: string }> }} props
 */
export default async function DriverOrdersPage({ searchParams }) {
  const auth = await requireAuthRSC({ allowedRoles: ['driver'] });

  const { page: pageParam } = await searchParams;
  const page  = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const limit = PAGE_LIMIT;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  // Admin client is required because the customer-name join reads a row
  // the driver doesn't own under RLS. Role check already happened in
  // requireAuthRSC above.
  const { data: rows, count } = await getAdminSupabase()
    .from('orders')
    .select(
      'id, pickup, dropoff, fare_amount, status, created_at, weight, package_type, vehicle_type, customer:profiles!orders_user_id_fkey(full_name)',
      { count: 'exact' },
    )
    .eq('driver_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  const orders = (rows ?? []).map((o) => ({
    id:       o.id,
    customer: o.customer?.full_name ?? 'Customer',
    pickup:   o.pickup  ?? '',
    dropoff:  o.dropoff ?? '',
    distance: '—',
    fare:     formatCurrency(Number(o.fare_amount) || 0),
    status:   o.status,
    date:     formatRelativeTime(o.created_at),
  }));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  // Subtitle stats are over the visible page only — the API never
  // returned a server-side fare aggregate. We could add one when the
  // driver earnings page graduates from "interesting" to "load-bearing".
  const pageDelivered = orders.filter((o) => o.status === 'delivered');
  const pageEarned    = pageDelivered.reduce((sum, o) => {
    const n = parseFloat((o.fare ?? '').replace(/[₦,\s]/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <DashboardLayout role="driver">
      <PageHeader
        title="My Orders"
        subtitle={`${total.toLocaleString()} total · ${pageDelivered.length} on this page · ${formatCurrency(pageEarned)} earned (this page)`}
      />

      <DriverOrdersTable
        orders={orders}
        pagination={{ page, pages, total }}
      />
    </DashboardLayout>
  );
}
