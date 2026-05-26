'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { useAuthGuard }                from '@/hooks/useAuthGuard';
import { useDashboardData }            from '@/hooks/useDashboardData';
import { mapDbOrder, ACTIVE_STATUSES } from '@/lib/utils/mapOrder';

import DashboardHeader   from '@/components/dashboard/DashboardHeader';
import HeroGreeting      from '@/components/dashboard/HeroGreeting';
import ActiveOrderBanner from '@/components/dashboard/ActiveOrderBanner';
import QuickActions      from '@/components/dashboard/QuickActions';
import RecentOrders      from '@/components/dashboard/RecentOrders';
import BottomNav         from '@/components/dashboard/BottomNav';
import PageShell         from '@/components/ui/PageShell';

const ACTIVE_LABEL = {
  confirmed:  'Finding Your Driver',
  processing: 'Driver on the Way',
  in_transit: 'Package In Transit',
};

function deriveActiveBanner(orders) {
  const active = orders.find((o) => ACTIVE_STATUSES.includes(o.status));
  if (!active) return null;
  return {
    id:       active.id,
    status:   ACTIVE_LABEL[active.status] ?? 'Order Processing',
    eta:      active.eta ?? (active.status === 'in_transit' ? '15–25 mins' : '25–40 mins'),
    location: active.dropoff?.address?.split(',')[0].trim() ?? '',
  };
}

// Shown only during the ~5ms window before the Supabase session is read.
// After Fix 1 in AuthContext this is barely visible, but kept as a safety
// net for cold-cache scenarios.
function AuthSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
    </div>
  );
}

// Pulsing placeholders that match the real greeting + orders layout.
// QuickActions and BottomNav are NOT skeletonised — they need no data
// so they render immediately and are usable while orders are loading.
function GreetingSkeleton() {
  return (
    <div className="animate-pulse space-y-2 pb-1">
      <div className="h-4 w-24 bg-slate-200 rounded-full" />
      <div className="h-7 w-52 bg-slate-200 rounded-full" />
      <div className="h-3 w-40 bg-slate-100 rounded-full" />
    </div>
  );
}

function RecentOrdersSkeleton() {
  return (
    <section>
      <div className="h-5 w-28 bg-slate-200 rounded-full animate-pulse mb-3" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-18 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user, role, loading: authLoading } = useAuthGuard();
  const { profile, orders, dataLoading }     = useDashboardData(user);

  const mappedOrders = useMemo(() => orders.map(mapDbOrder), [orders]);
  const activeBanner = useMemo(() => deriveActiveBanner(mappedOrders), [mappedOrders]);

  // Auth not resolved yet — will clear in ~5ms after Fix 1 (no DB round-trip).
  if (authLoading) return <AuthSpinner />;

  const displayName  = profile?.full_name ?? '';
  const displayPhone = profile?.phone ?? '';
  const isDataLoading = Boolean(user && dataLoading);

  return (
    <PageShell>
      <DashboardHeader phone={displayPhone} fullName={displayName} role={role} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 pb-28 space-y-5">
        {/* Greeting and active banner — skeleton until orders API resolves */}
        {isDataLoading ? <GreetingSkeleton /> : (
          <>
            <HeroGreeting phone={displayPhone} fullName={displayName} />

            {activeBanner && (
              <Link href={`/dashboard/orders/${activeBanner.id}`}>
                <ActiveOrderBanner order={activeBanner} />
              </Link>
            )}
          </>
        )}

        {/* QuickActions needs no server data — always render immediately */}
        <QuickActions />

        {/* Orders list — skeleton rows until fetch completes */}
        {isDataLoading
          ? <RecentOrdersSkeleton />
          : <RecentOrders orders={mappedOrders} />
        }
      </main>

      <BottomNav />
    </PageShell>
  );
}
