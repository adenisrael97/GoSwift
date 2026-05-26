'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Flag, X } from 'lucide-react';

import { supabase, getMyOrder, cancelMyOrder, subscribeOrderUpdates } from '@/lib/api';
import { mapDbOrder }   from '@/lib/utils/mapOrder';
import { useAuthGuard } from '@/hooks/useAuthGuard';

import StatusBadge      from '@/components/orders/StatusBadge';
import DeliveryTracker  from '@/components/orders/DeliveryTracker';
import DriverCard       from '@/components/orders/DriverCard';
import ReceiptCard   from '@/components/orders/ReceiptCard';
import BottomNav     from '@/components/dashboard/BottomNav';
import PageShell     from '@/components/ui/PageShell';
import AppHeader     from '@/components/ui/AppHeader';
import OrderNotFound from '@/components/ui/OrderNotFound';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
    </div>
  );
}

export default function OrderDetailPage() {
  const { id }                         = useParams();
  const { user, loading: authLoading } = useAuthGuard();
  const [order,       setOrder]        = useState(null);
  const [dataLoading, setDataLoading]  = useState(true);
  const [cancelOpen,  setCancelOpen]   = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling,  setCancelling]   = useState(false);
  const [cancelError, setCancelError]  = useState('');

  // Tracks whether the loaded order already carries driver contact info,
  // so the realtime handler re-fetches exactly once when a driver is
  // assigned (the initial load happens before assignment).
  const hasDriverRef = useRef(false);
  // Monotonic token so an out-of-order fetch (fast order→order navigation,
  // or a realtime re-fetch overlapping the initial load) can't apply stale
  // data over a newer one — only the most recent request wins.
  const reqSeqRef = useRef(0);

  const loadOrder = useCallback(async () => {
    if (!user || !id) return;
    const seq = ++reqSeqRef.current;
    const { data, error } = await getMyOrder(id, user.id);
    if (seq !== reqSeqRef.current) return; // superseded by a newer load
    if (!error && data) {
      const mapped = mapDbOrder(data);
      hasDriverRef.current = Boolean(mapped.driver);
      setOrder(mapped);
    }
  }, [user, id]);

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    setCancelError('');

    const { ok, body } = await cancelMyOrder(id, cancelReason.trim() || null);
    if (ok) {
      setOrder((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      setCancelOpen(false);
      setCancelReason('');
    } else {
      setCancelError(body?.error ?? 'Could not cancel order');
    }
    setCancelling(false);
  }

  const canCancel = order && ['pending', 'confirmed', 'processing'].includes(order.status);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;

    (async () => {
      await loadOrder();
      if (!cancelled) setDataLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, id, loadOrder]);

  // Realtime: react to driver status advances (processing → in_transit → delivered)
  // and admin/cancel changes without polling. Functional state update avoids
  // needing `order` in the dep array — stable across all re-renders.
  useEffect(() => {
    if (!user || !id) return;

    const channel = subscribeOrderUpdates(id, (payload) => {
      const raw = payload.new;

      // A driver was just assigned but we loaded the order before that —
      // re-fetch once to pull the driver join (name/phone) for the
      // contact card. RLS now permits the customer to read their
      // assigned driver's profile.
      if (raw.driver_id && !hasDriverRef.current) {
        hasDriverRef.current = true; // guard against duplicate fetches
        loadOrder();
        return;
      }

      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: raw.status ?? prev.status,
          timestamps: {
            ...prev.timestamps,
            pickedUp:  raw.pickup_at    ?? prev.timestamps?.pickedUp,
            delivered: raw.delivered_at ?? prev.timestamps?.delivered,
            cancelled: raw.cancelled_at ?? prev.timestamps?.cancelled,
          },
        };
      });
    });

    return () => { supabase.removeChannel(channel); };
  }, [user, id, loadOrder]);

  if (authLoading || dataLoading) return <LoadingScreen />;
  if (!order) return <OrderNotFound />;

  return (
    <PageShell>
      <AppHeader backHref="/dashboard/orders" />

      {/* Status banner */}
      <div
        className={`border-b ${
          order.status === 'delivered'
            ? 'bg-emerald-50/50 border-emerald-100'
            : order.status === 'cancelled'
            ? 'bg-red-50/50 border-red-100'
            : 'bg-orange-50/50 border-orange-100'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 py-2.5 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-sm text-slate-500">{order.date}</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 hidden sm:block">
            #{order.id}
          </span>
        </div>
      </div>

      <main className="flex-1 pb-28">
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 space-y-4">

          {order.driver && <DriverCard driver={order.driver} />}

          <DeliveryTracker
            status={order.status}
            timestamps={order.timestamps ?? {}}
          />

          {/* Route card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
              Delivery Route
            </h3>
            <div className="relative space-y-6">
              <div className="absolute left-2.5 top-5 bottom-5 w-0 border-l-2 border-dashed border-[#ab3500]/40" />

              <div className="relative flex items-start gap-4">
                <div className="relative z-10 w-5 h-5 rounded-full bg-orange-50 border-2 border-[#ab3500] flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#ab3500]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#ab3500] uppercase tracking-widest mb-0.5">Pickup</p>
                  <p className="text-sm font-medium text-slate-900">{order.pickup.address}</p>
                </div>
              </div>

              <div className="relative flex items-start gap-4">
                <div className="relative z-10 w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={10} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dropoff</p>
                  <p className="text-sm font-medium text-slate-900">{order.dropoff.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Package + Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Package Details
                  </h3>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                    #{order.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
                  <span className="text-3xl">{order.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{order.package.type}</p>
                    <p className="text-sm text-slate-500">{order.package.category}</p>
                  </div>
                  <div className="bg-orange-50 text-[#ab3500] px-3 py-1.5 rounded-lg">
                    <p className="text-xs font-extrabold">{order.package.weight}</p>
                  </div>
                </div>
                {order.vehicleType && (
                  <div className="flex items-center gap-3 mt-3 px-4 py-3 bg-slate-50 rounded-xl">
                    <span className="text-xl">{order.vehicleEmoji}</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle</p>
                      <p className="text-sm font-bold text-slate-900">{order.vehicleLabel}</p>
                    </div>
                  </div>
                )}
              </div>
              <button className="w-full mt-4 py-3 text-slate-500 text-sm hover:text-slate-900 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl">
                <Flag size={14} />
                Report an issue with this delivery
              </button>
            </div>

            <ReceiptCard payment={order.payment} />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              href={`/dashboard/orders/${order.id}/summary`}
              className="w-full py-3.5 bg-[#ab3500] text-white rounded-xl font-bold text-center flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              View Receipt →
            </Link>
            <Link
              href="/dashboard/orders"
              className="w-full py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold text-center hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              ← Back to Orders
            </Link>
          </div>

          {canCancel && (
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Cancel this order
            </button>
          )}

        </div>
      </main>

      <BottomNav />

      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={() => !cancelling && setCancelOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-slate-900">Cancel this order?</h3>
            <p className="text-sm text-slate-500 mt-1">
              You can only cancel before the driver picks up your package. After pickup, contact support.
            </p>
            <label className="block mt-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                Reason (optional)
              </span>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value.slice(0, 500))}
                rows={3}
                disabled={cancelling}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-[#ab3500] focus:bg-white resize-none"
                placeholder="e.g. address was wrong"
              />
            </label>
            {cancelError && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">{cancelError}</p>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-60"
              >
                Keep order
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
