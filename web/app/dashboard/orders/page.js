/**
 * /dashboard/orders — order history (Server Component).
 *
 * Migrated from a 'use client' useEffect-fetch page in Sprint 3. The
 * customer's order list is read-only and not realtime-driven, so we
 * inline the data on first paint instead of round-tripping through
 * /api/orders. Tab switching uses a search param (?tab=active|inactive)
 * so the URL is canonical and back/forward works without JS.
 *
 * Data freshness: users navigate away and back to see new status; the
 * dashboard hero page (/dashboard) keeps its realtime subscription
 * because it shows the live in-flight order banner.
 */
import Link from 'next/link';

import { requireAuthRSC }              from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase }            from '@/lib/server/supabase.admin';
import { mapDbOrder, ACTIVE_STATUSES } from '@/lib/utils/mapOrder';

import OrderList from '@/components/orders/OrderList';
import BottomNav from '@/components/dashboard/BottomNav';
import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';

const ORDER_LIST_COLUMNS = `
  id, pickup, dropoff, package_type, vehicle_type, weight,
  fare_amount, payment_method, payment_status, status, note,
  sender_phone, receiver_name, receiver_phone, created_at,
  driver:profiles!orders_driver_id_fkey (
    full_name, phone,
    driver_profiles ( rating, total_trips, vehicle_model )
  )
`;

/**
 * @param {{ searchParams: Promise<{ tab?: string }> }} props
 */
export default async function OrdersPage({ searchParams }) {
  // requireAuthRSC redirects to /login when no session, or to the
  // user's own role-root when they hit a route they shouldn't.
  const auth = await requireAuthRSC();

  const { tab: tabParam } = await searchParams;
  const tab = tabParam === 'inactive' ? 'inactive' : 'active';

  const { data: rows } = await getAdminSupabase()
    .from('orders')
    .select(ORDER_LIST_COLUMNS)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  /** @type {Array<ReturnType<typeof mapDbOrder>>} */
  const activeOrders = [];
  /** @type {Array<ReturnType<typeof mapDbOrder>>} */
  const inactiveOrders = [];
  for (const row of rows ?? []) {
    const order = mapDbOrder(row);
    (ACTIVE_STATUSES.includes(order.status) ? activeOrders : inactiveOrders).push(order);
  }

  const displayed = tab === 'active' ? activeOrders : inactiveOrders;

  return (
    <PageShell>
      <AppHeader backHref="/dashboard" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 pb-28 space-y-6">

        <section>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
            Order History
          </h1>
          <p className="text-sm text-slate-500">Track and manage your recent deliveries</p>
        </section>

        {/* Filter tabs — Links so they're crawlable + work without JS */}
        <div className="flex gap-2 bg-orange-50 p-1.5 rounded-2xl border border-orange-100 max-w-xs">
          {[
            { key: 'active',   label: 'Active', count: activeOrders.length },
            { key: 'inactive', label: 'Past',   count: inactiveOrders.length },
          ].map(({ key, label, count }) => (
            <Link
              key={key}
              href={`/dashboard/orders?tab=${key}`}
              replace
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key
                  ? 'bg-[#ab3500] text-white shadow-md'
                  : 'text-slate-500 hover:bg-white'
              }`}
            >
              {label}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </Link>
          ))}
        </div>

        <OrderList orders={displayed} />
      </main>

      <BottomNav />
    </PageShell>
  );
}
