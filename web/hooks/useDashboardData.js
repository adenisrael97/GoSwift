'use client';

import { useEffect, useState } from 'react';
import { supabase, listMyOrders, subscribeMyOrders } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Fetches and live-syncs dashboard data (profile + orders) for the
 * authenticated user.
 *
 * Pass the Supabase user object from useAuthGuard as the trigger.
 * Returns { profile, orders, setOrders, dataLoading }.
 *
 * Real-time: subscribes to UPDATE events on the orders table filtered
 * to the current user. When an order status changes (e.g. processing,
 * in_transit, delivered), the local orders array is updated immediately
 * without a full page refresh.
 */
export function useDashboardData(user) {
  // Profile comes from AuthContext — no second fetch needed.
  const { profile } = useAuth();
  const [orders,      setOrders]      = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchData() {
      const { ok, body } = await listMyOrders();
      if (cancelled) return;
      if (ok) setOrders(body.orders ?? []);
      setDataLoading(false);
    }

    fetchData();

    // Real-time: update matching order in local state when status changes.
    // This drives the active-order banner on the dashboard and the status
    // badge on the orders list without any manual refresh.
    const channel = subscribeMyOrders(user.id, (payload) => {
      if (cancelled) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === payload.new.id ? { ...o, ...payload.new } : o
        )
      );
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { profile, orders, setOrders, dataLoading };
}
