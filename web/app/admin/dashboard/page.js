'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardCheck, X, Bell } from 'lucide-react';

import { useAuthGuard }  from '@/hooks/useAuthGuard';
import {
  supabase,
  getAdminStats,
  listAdminOrders,
  listAdminApplications,
  listAdminUsers,
  subscribeAdminOrders,
  subscribeAdminApplications,
} from '@/lib/api';

import DashboardLayout   from '@/components/shared/DashboardLayout';
import PageHeader        from '@/components/shared/PageHeader';
import AdminStatsCard    from '@/components/admin/AdminStatsCard';
import AdminTable        from '@/components/admin/AdminTable';
import Button            from '@/components/shared/Button';

// ── Sub-components ──────────────────────────────────────────────────

function RecentSignupRow({ signup }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${signup.avatarClass}`}>
          {signup.initials}
        </div>
        <div>
          <p className="text-sm font-bold text-[#0F1923] leading-tight">{signup.name}</p>
          <p className="text-xs text-slate-400">{signup.phone}</p>
        </div>
      </div>
      <span className="text-xs text-slate-400 shrink-0">{signup.joined}</span>
    </div>
  );
}

/**
 * Dismissable toast that appears at the top of the page when a new
 * driver application arrives via Realtime. Auto-dismisses after 10s.
 */
function ApplicationToast({ notification, onDismiss }) {
  if (!notification) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 w-full max-w-sm bg-white border border-amber-200 shadow-xl rounded-2xl overflow-hidden animate-slide-in-right"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
          <Bell size={18} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">New Driver Application</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {notification.name} just applied to become a driver.
          </p>
          <Link
            href={`/admin/drivers/${notification.id}`}
            onClick={onDismiss}
            className="inline-block mt-2 text-xs font-bold text-[#ab3500] hover:underline"
          >
            Review application →
          </Link>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      {/* Progress bar that drains over 10s */}
      <div className="h-1 bg-amber-100">
        <div className="h-full bg-amber-400 animate-drain-10s" />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'admin' });
  const [stats,        setStats]        = useState([]);
  const [liveOrders,   setLiveOrders]   = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [signups,      setSignups]      = useState([]);
  const [dataLoading,  setDataLoading]  = useState(true);

  // { id, name } of the most recent new application, or null when dismissed.
  const [appNotification, setAppNotification] = useState(null);
  const dismissTimerRef  = useRef(null);
  const refetchTimerRef  = useRef(null);
  const refetchInFlight  = useRef(false);

  const dismissNotification = useCallback(() => {
    setAppNotification(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function refetchOrdersAndStats() {
      if (cancelled || refetchInFlight.current) return;
      refetchInFlight.current = true;
      try {
        const [freshStats, freshOrders] = await Promise.all([
          getAdminStats(),
          listAdminOrders(),
        ]);
        if (cancelled) return;
        if (freshStats.ok && freshStats.body.stats)    setStats(freshStats.body.stats);
        if (freshOrders.ok && freshOrders.body.orders) setLiveOrders(freshOrders.body.orders.slice(0, 8));
      } finally {
        refetchInFlight.current = false;
      }
    }

    async function load() {
      const [statsRes, ordersRes, appsRes, usersRes] = await Promise.all([
        getAdminStats(),
        listAdminOrders(),
        listAdminApplications(),
        listAdminUsers(),
      ]);

      if (cancelled) return;
      if (statsRes.ok  && statsRes.body.stats)   setStats(statsRes.body.stats);
      if (ordersRes.ok && ordersRes.body.orders) setLiveOrders(ordersRes.body.orders.slice(0, 8));
      if (appsRes.ok)                            setPendingCount(appsRes.body.counts?.pending ?? 0);
      if (usersRes.ok  && usersRes.body.users)   setSignups(usersRes.body.users.slice(0, 5));
      setDataLoading(false);
    }

    load();

    // Realtime: coalesce bursts of order changes into one refetch every ~750ms.
    const ordersChannel = subscribeAdminOrders(() => {
      if (cancelled) return;
      if (refetchTimerRef.current) return;
      refetchTimerRef.current = setTimeout(() => {
        refetchTimerRef.current = null;
        refetchOrdersAndStats();
      }, 750);
    });

    // Realtime: new driver application submitted → bump count + show toast.
    const appsChannel = subscribeAdminApplications((payload) => {
      if (cancelled) return;
      const row = payload.new;
      if (!row || row.status !== 'pending') return;

      setPendingCount((prev) => prev + 1);

      // Replace any existing notification (only one toast at a time).
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setAppNotification({ id: row.id, name: row.full_name ?? 'A driver' });

      // Auto-dismiss after 10s.
      dismissTimerRef.current = setTimeout(() => {
        setAppNotification(null);
        dismissTimerRef.current = null;
      }, 10_000);
    });

    return () => {
      cancelled = true;
      if (refetchTimerRef.current)  clearTimeout(refetchTimerRef.current);
      if (dismissTimerRef.current)  clearTimeout(dismissTimerRef.current);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(appsChannel);
    };
  }, [user]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout role="admin">
      <ApplicationToast
        notification={appNotification}
        onDismiss={dismissNotification}
      />

      <PageHeader
        title="Logistics Overview"
        subtitle="Tracking real-time performance and active deliveries across Nigeria."
        actions={
          <Link href="/admin/orders">
            <Button size="sm">View all orders</Button>
          </Link>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat) => (
          <AdminStatsCard key={stat.id} {...stat} />
        ))}
      </section>

      <div className="mb-8">
        <AdminTable orders={liveOrders} />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] flex flex-col items-center text-center">
          <div className="relative w-16 h-16 mb-5">
            <div className="w-full h-full bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
              <ClipboardCheck size={32} />
            </div>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ab3500] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-[#0F1923] mb-1">Driver Applications</h3>
          <div className="text-5xl font-black text-[#0F1923] mb-2">{pendingCount}</div>
          <p className="text-slate-500 text-sm font-medium mb-8">
            Awaiting review and onboarding verification.
          </p>
          <Link href="/admin/drivers" className="w-full">
            <Button fullWidth size="lg" className="gap-2">
              Review Applications
              <ChevronRight size={18} />
            </Button>
          </Link>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#0F1923]">Recent Signups</h3>
            <Link href="/admin/users" className="text-[#ab3500] text-sm font-bold hover:underline">
              See All
            </Link>
          </div>

          {signups.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No signups yet.</p>
          ) : (
            <div className="space-y-5">
              {signups.map((signup) => (
                <RecentSignupRow key={signup.id} signup={signup} />
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}
