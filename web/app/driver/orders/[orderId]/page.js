'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Package, Star, Navigation, Phone, MessageCircle, AlertTriangle } from 'lucide-react';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import {
  supabase,
  getDriverOrder,
  subscribeDriverOrder,
  advanceOrderStatus,
  releaseOrder,
} from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { VEHICLE_LABELS, VEHICLE_EMOJIS } from '@/lib/utils/order';

import DashboardLayout from '@/components/shared/DashboardLayout';
import PageHeader      from '@/components/shared/PageHeader';
import Badge           from '@/components/shared/Badge';
import Button          from '@/components/shared/Button';
import Card            from '@/components/shared/Card';

// Driver-controlled status progression. Hoisted to module scope so the
// useCallback dep array stays stable.
const NEXT_STATUS = { processing: 'in_transit', in_transit: 'delivered' };
const NEXT_LABEL  = { processing: 'Mark as Picked Up', in_transit: 'Mark as Delivered' };

function cleanPhone(phone) {
  return (phone ?? '').replace(/[^\d+]/g, '');
}

function initials(name) {
  if (!name || typeof name !== 'string') return '?';
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-[#0F1923] text-right">{value}</span>
    </div>
  );
}

function Stars({ rating }) {
  if (!rating) return <span className="text-xs text-slate-400">Not rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  );
}

// Maps a raw orders row + customer join to the UI shape used by the
// page. Centralised so initial-load and realtime-update paths produce
// the exact same view-model.
function rowToOrder(data) {
  return {
    id:            data.id,
    customer:      data.customer?.full_name ?? 'Customer',
    customerPhone: data.sender_phone ?? data.customer?.phone ?? null,
    date:          formatRelativeTime(data.created_at),
    status:        data.status,
    pickup:        data.pickup  ?? '',
    dropoff:       data.dropoff ?? '',
    distance:      '—',
    fare:          formatCurrency(Number(data.fare_amount) || 0),
    package: {
      type:        data.package_type ?? 'parcel',
      weight:      `${data.weight ?? 0} kg`,
      vehicleType: data.vehicle_type ?? 'car',
    },
    receiver: {
      name:  data.receiver_name  ?? null,
      phone: data.receiver_phone ?? null,
    },
    senderPhone: data.sender_phone ?? null,
    rating: null,
  };
}

export default function DriverOrderDetailPage() {
  const { orderId }                    = useParams();
  const router                         = useRouter();
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'driver' });
  const [order,       setOrder]       = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [advancing,   setAdvancing]   = useState(false);
  const [advanceErr,  setAdvanceErr]  = useState('');

  // ── Release order state ──────────────────────────────────────
  // Three-phase UI: idle → confirming (show reason textarea) → releasing
  const [releasePhase,  setReleasePhase]  = useState('idle'); // 'idle'|'confirming'|'releasing'
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseErr,    setReleaseErr]    = useState('');
  const releaseInFlightRef               = useRef(false);

  // Initial load.
  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await getDriverOrder(orderId, user.id);
      if (!cancelled) {
        if (!error && data) setOrder(rowToOrder(data));
        setDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, orderId]);

  // Realtime: react to status changes pushed by admin/cancel/customer
  // cancel paths. orders is in the supabase_realtime publication, RLS
  // delivers only rows the driver owns. The filter keeps the firehose off
  // the wire.
  useEffect(() => {
    if (!user || !orderId) return;

    const channel = subscribeDriverOrder(orderId, (payload) => {
      // payload.new lacks the customer join; merge over current state.
      setOrder((prev) => prev ? { ...prev, status: payload.new.status } : prev);
    });

    return () => { supabase.removeChannel(channel); };
  }, [user, orderId]);

  const handleAdvanceStatus = useCallback(async () => {
    if (!order || advancing) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    setAdvancing(true);
    setAdvanceErr('');
    const { ok, body } = await advanceOrderStatus(orderId, nextStatus);
    if (ok) {
      if (body.status === 'delivered') {
        // Delivery complete — return to dashboard immediately.
        router.replace('/driver/dashboard');
        return;
      }
      setOrder((prev) => prev ? { ...prev, status: body.status } : prev);
    } else {
      setAdvanceErr(body?.error ?? 'Could not update status. Please try again.');
    }
    setAdvancing(false);
  }, [order, advancing, orderId, router]);

  const handleRelease = useCallback(async () => {
    if (releaseInFlightRef.current) return;
    releaseInFlightRef.current = true;
    setReleasePhase('releasing');
    setReleaseErr('');

    const { ok, body } = await releaseOrder(orderId, releaseReason.trim() || null);

    releaseInFlightRef.current = false;

    if (ok) {
      // Order is back in the dispatch pool — navigate away immediately.
      router.replace('/driver/dashboard');
    } else {
      setReleasePhase('confirming');
      setReleaseErr(body?.error ?? 'Could not release order. Please try again.');
    }
  }, [orderId, releaseReason, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="driver">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Order not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';

  return (
    <DashboardLayout role="driver">
      <PageHeader
        backHref="/driver/orders"
        title={`Order #${order.id.slice(0, 8)}`}
        subtitle={`${order.customer} • ${order.date}`}
        actions={<Badge label={order.status} variant={order.status} />}
      />

      {order.status === 'cancelled' && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This order was cancelled. No further actions are available.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Route */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={18} className="text-[#ab3500]" />
              <h3 className="text-base font-bold text-[#0F1923]">Route</h3>
            </div>

            <div className="relative flex flex-col gap-6">
              <div className="absolute left-2.75 top-4 bottom-4 border-l-2 border-dashed border-slate-200" />

              <div className="flex items-start gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ab3500]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Pickup</p>
                  <p className="text-sm font-bold text-[#0F1923]">{order.pickup || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Dropoff</p>
                  <p className="text-sm font-bold text-[#0F1923]">{order.dropoff || '—'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 pt-5 border-t border-slate-100">
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                Distance · {order.distance}
              </div>
              <div className="px-3 py-2 bg-orange-50 rounded-lg text-xs font-bold text-[#ab3500]">
                Fare · {order.fare}
              </div>
            </div>

            {!isTerminal && (order.pickup || order.dropoff) && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  order.status === 'in_transit' ? (order.dropoff || order.pickup) : (order.pickup || order.dropoff)
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full mt-6"
              >
                <Button fullWidth size="lg" className="gap-2">
                  <Navigation size={16} />
                  Open in Maps
                </Button>
              </a>
            )}
          </Card>

          {/* Package */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Package size={18} className="text-[#ab3500]" />
              <h3 className="text-base font-bold text-[#0F1923]">Package</h3>
            </div>
            <InfoRow label="Type"   value={order.package.type} />
            <InfoRow label="Weight" value={order.package.weight} />
            <InfoRow
              label="Vehicle Required"
              value={`${VEHICLE_EMOJIS[order.package.vehicleType] ?? '🚗'} ${VEHICLE_LABELS[order.package.vehicleType] ?? 'Car'}`}
            />
          </Card>
        </div>

        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <h3 className="text-base font-bold text-[#0F1923] mb-5">Customer</h3>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                {initials(order.customer)}
              </div>
              <div>
                <p className="font-bold text-[#0F1923]">{order.customer}</p>
                <p className="text-xs text-slate-400">{order.date}</p>
              </div>
            </div>
            {order.customerPhone ? (
              <div className="space-y-2">
                <a href={`tel:${cleanPhone(order.customerPhone)}`} className="block">
                  <Button variant="secondary" fullWidth className="gap-1.5">
                    <Phone size={14} /> Call
                  </Button>
                </a>
                <a href={`sms:${cleanPhone(order.customerPhone)}`} className="block">
                  <Button variant="secondary" fullWidth className="gap-1.5">
                    <MessageCircle size={14} /> Message
                  </Button>
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No phone on file</p>
            )}
          </Card>

          {/* Recipient */}
          {order.receiver?.name && (
            <Card>
              <h3 className="text-base font-bold text-[#0F1923] mb-5">Recipient</h3>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  {initials(order.receiver.name)}
                </div>
                <div>
                  <p className="font-bold text-[#0F1923]">{order.receiver.name}</p>
                  {order.receiver.phone && <p className="text-xs text-slate-400">{order.receiver.phone}</p>}
                </div>
              </div>
              {order.receiver.phone ? (
                <a href={`tel:${cleanPhone(order.receiver.phone)}`} className="block">
                  <Button variant="secondary" fullWidth className="gap-1.5">
                    <Phone size={14} /> Call Recipient
                  </Button>
                </a>
              ) : (
                <p className="text-xs text-slate-400 italic">No recipient phone on file</p>
              )}
            </Card>
          )}

          {/* Rating */}
          <Card>
            <h3 className="text-base font-bold text-[#0F1923] mb-3">Customer rating</h3>
            <Stars rating={order.rating} />
          </Card>

          {/* Status progression */}
          {NEXT_STATUS[order.status] && (
            <div>
              <button
                onClick={handleAdvanceStatus}
                disabled={advancing}
                className="w-full py-4 bg-[#ab3500] text-white rounded-2xl font-bold text-sm shadow-[0_8px_20px_-6px_rgba(171,53,0,0.4)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {advancing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Updating…
                  </>
                ) : NEXT_LABEL[order.status]}
              </button>
              {advanceErr && (
                <p role="alert" className="mt-2 text-sm font-medium text-red-600 text-center">
                  {advanceErr}
                </p>
              )}
            </div>
          )}

          {/* Release order — only before pickup (processing state) */}
          {order.status === 'processing' && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <h3 className="text-sm font-bold text-[#0F1923]">Unable to take this order?</h3>
              </div>

              {releasePhase === 'idle' && (
                <>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    If you are unable to complete this delivery, you can release it. The order will be
                    reassigned to the next available driver near the pickup point.
                  </p>
                  <button
                    onClick={() => setReleasePhase('confirming')}
                    className="w-full py-3 rounded-xl border-2 border-amber-300 text-amber-700 bg-amber-50 font-bold text-sm hover:bg-amber-100 active:scale-[0.98] transition-all"
                  >
                    Release This Order
                  </button>
                </>
              )}

              {(releasePhase === 'confirming' || releasePhase === 'releasing') && (
                <>
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Reason <span className="text-slate-400 font-normal">(optional)</span>
                  </p>
                  <textarea
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                    disabled={releasePhase === 'releasing'}
                    placeholder="e.g. Vehicle breakdown, wrong location…"
                    rows={3}
                    className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 resize-none placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60 mb-3"
                  />

                  {releaseErr && (
                    <p role="alert" className="text-xs font-medium text-red-600 mb-3">
                      {releaseErr}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setReleasePhase('idle'); setReleaseErr(''); }}
                      disabled={releasePhase === 'releasing'}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-60 transition-colors"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={handleRelease}
                      disabled={releasePhase === 'releasing'}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-1.5"
                    >
                      {releasePhase === 'releasing' ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Releasing…
                        </>
                      ) : 'Confirm Release'}
                    </button>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
