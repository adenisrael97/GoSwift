'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuthGuard }          from '@/hooks/useAuthGuard';
import { useDriverLocation }     from '@/hooks/useDriverLocation';
import { useDriverOnlineStatus } from '@/hooks/useDriverOnlineStatus';
import {
  supabase,
  getDriverDashboard,
  listLiveOffers,
  getOfferOrderBrief,
  acceptOffer,
  rejectOffer,
  subscribeDriverOffers,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils/format';

import DashboardLayout   from '@/components/shared/DashboardLayout';
import DriverStatsCard   from '@/components/driver/DriverStatsCard';
import DriverOrderList   from '@/components/driver/DriverOrderList';
import DispatchOfferCard from '@/components/driver/DispatchOfferCard';
import { ShoppingBag }   from 'lucide-react';

const PRO_TIP = {
  title: 'Pro Tip',
  body:  'During peak hours (4PM – 7PM), demand in Victoria Island increases by 40%. Stay near Ozumba Mbadiwe for more requests.',
};

/**
 * Driver dashboard.
 *
 * Architecture:
 *   • Online state   — useDriverOnlineStatus (API-backed toggle, GPS-independent)
 *   • GPS tracking   — useDriverLocation (only runs while online)
 *   • Dispatch offers — Supabase Realtime subscription + REST hydration
 *
 * GPS is a quality-of-service enhancement:
 *   - Online + GPS available → full dispatch priority
 *   - Online + GPS unavailable → still eligible, lower dispatch priority
 *   - Driver is NEVER blocked from going online by GPS state
 *
 * This architecture is intentionally PWA-ready: background GPS is
 * unreliable on iOS/low-end Android, so GPS must never be a hard gate.
 */
export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthGuard({ requiredRole: 'driver' });

  // ── Dashboard data ───────────────────────────────────────────
  const [dashData,    setDashData]    = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Online/offline state (decoupled from GPS) ────────────────
  const {
    isOnline,
    toggling,
    statusError,
    toggle: toggleOnline,
    clearError,
    setOnlineFromServer,
  } = useDriverOnlineStatus();

  // ── GPS tracking (enabled only when online) ──────────────────
  // Not enabled while offline: no battery drain, no permission prompts
  // before the driver has chosen to work.
  const {
    status:          geoStatus,
    hasLiveLocation,
    lastKnownCoords,
    error:           geoError,
  } = useDriverLocation({ enabled: isOnline });

  // ── Dispatch offers ──────────────────────────────────────────
  const [offers,      setOffers]      = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [offerError,  setOfferError]  = useState('');

  // Synchronous in-flight lock. useState is async — two rapid taps can
  // both pass a state-based guard before React re-renders and disables
  // the button. A ref flips instantly in the same event-loop tick.
  const actionInFlightRef = useRef(false);

  // ── Load dashboard data ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const [dashRes, offersRes] = await Promise.all([
        getDriverDashboard(),
        fetchLiveOffers(user.id),
      ]);

      if (cancelled) return;

      if (dashRes.ok) {
        setDashData(dashRes.body);
        // Seed online state from server — respects any toggle made during load.
        setOnlineFromServer(dashRes.body.driverProfile.isOnline);
      }
      setOffers(offersRes);
      setDataLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, setOnlineFromServer]);

  // ── Drop offers when going offline ──────────────────────────
  // Clear immediately in the handler (not an effect) so the list
  // disappears the moment the driver taps "Go Offline" rather than
  // waiting for the next render cycle. Avoids setState-in-effect lint.
  const handleToggleOnline = useCallback(() => {
    if (isOnline) setOffers([]);
    toggleOnline();
  }, [isOnline, toggleOnline]);

  // ── Realtime: subscribe to dispatch_offers for this driver ───
  useEffect(() => {
    if (!user) return;

    const channel = subscribeDriverOffers(user.id, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new.status === 'offered') {
        hydrateOfferRow(payload.new).then((offer) => {
          setOffers((prev) =>
            prev.some((o) => o.id === offer.id) ? prev : [offer, ...prev]
          );
        });
        return;
      }

      if (payload.eventType === 'UPDATE' && payload.new.status !== 'offered') {
        setOffers((prev) => prev.filter((o) => o.id !== payload.new.id));
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Offer actions ────────────────────────────────────────────
  const handleAccept = useCallback(async (offerId) => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setAcceptingId(offerId);
    setOfferError('');

    const { ok, body } = await acceptOffer(offerId);
    actionInFlightRef.current = false;
    setAcceptingId(null);

    if (ok) {
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      router.push(`/driver/orders/${body.orderId}`);
    } else {
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      setOfferError(body?.error ?? 'That offer is no longer available.');
    }
  }, [router]);

  const handleReject = useCallback(async (offerId) => {
    if (actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setRejectingId(offerId);
    setOfferError('');

    const { ok, body } = await rejectOffer(offerId);
    actionInFlightRef.current = false;
    setRejectingId(null);
    setOffers((prev) => prev.filter((o) => o.id !== offerId));
    if (!ok && body?.error) setOfferError(body.error);
  }, []);

  // ── Loading states ───────────────────────────────────────────
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
      </div>
    );
  }

  const dp               = dashData?.driverProfile ?? { name: 'Driver', initials: 'D', phone: null };
  const stats            = dashData?.stats         ?? { earningsToday: 0, deliveriesToday: 0, totalTrips: 0 };
  const recentDeliveries = dashData?.recentDeliveries ?? [];
  const activeOrder      = dashData?.activeOrder      ?? null;

  const statsCards = [
    { id: 'earnings',   label: "Today's Earnings", value: formatCurrency(stats.earningsToday), icon: 'banknote', trend: 'up' },
    { id: 'deliveries', label: 'Deliveries Today', value: String(stats.deliveriesToday),       icon: 'package' },
    { id: 'trips',      label: 'Total Trips',      value: String(stats.totalTrips),            icon: 'clock' },
  ];

  // Derive GPS indicator for the hero card.
  const gpsIndicator = resolveGpsIndicator(isOnline, geoStatus, hasLiveLocation, geoError);

  return (
    <DashboardLayout role="driver">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">

          {/* Hero Status Card */}
          <section>
            <div className="bg-[#0F1923] rounded-4xl p-6 md:p-10 shadow-xl relative overflow-hidden">

              {/* Top row: avatar + toggle */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-linear-to-br from-[#ff6b35] to-[#ab3500] flex items-center justify-center text-white font-bold text-xl">
                    {dp.initials}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl md:text-2xl">{dp.name}</h2>
                    {dp.phone && (
                      <p className="text-slate-400 text-xs font-medium tracking-wide mt-0.5">
                        {dp.phone}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`w-2 h-2 rounded-full animate-pulse ${
                          isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <p className="text-slate-400 text-sm">
                        {isOnline
                          ? geoStatus === 'acquiring'
                            ? 'Online — getting GPS…'
                            : 'Waiting for offers…'
                          : 'You are offline'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Toggle — only disabled during the API call, never by GPS */}
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={handleToggleOnline}
                    disabled={toggling}
                    aria-label={isOnline ? 'Go offline' : 'Go online'}
                    className={`w-14 h-8 rounded-full p-1 flex items-center transition-all duration-300 ${
                      isOnline ? 'bg-[#ab3500] justify-end' : 'bg-slate-600 justify-start'
                    } ${toggling ? 'opacity-60' : ''}`}
                  >
                    <div className="w-6 h-6 bg-white rounded-full shadow-md" />
                  </button>
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                    {toggling ? '…' : isOnline ? 'Go Offline' : 'Go Online'}
                  </span>
                </div>
              </div>

              {/* Main status text */}
              <div className="relative z-10">
                <h3 className="text-white text-3xl md:text-5xl font-black">
                  {isOnline ? "You're Online" : "You're Offline"}
                </h3>
                <p className="text-slate-400 mt-2 text-sm md:text-base">
                  {isOnline
                    ? gpsIndicator.subtext
                    : 'Go online to start receiving delivery offers.'}
                </p>

                {/* API status error (toggle failure) */}
                {statusError && (
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-red-300 text-sm flex-1">{statusError}</p>
                    <button
                      onClick={clearError}
                      aria-label="Dismiss"
                      className="text-red-400 hover:text-red-200 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* GPS indicator pill — non-blocking, only shown when online */}
                {isOnline && gpsIndicator.pill && (
                  <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${gpsIndicator.pillClass}`}>
                    <span>{gpsIndicator.pillIcon}</span>
                    <span>{gpsIndicator.pill}</span>
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-slate-700">
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">
                    Need a delivery yourself?
                  </p>
                  <Link
                    href="/dashboard/new-order"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                  >
                    <ShoppingBag size={16} />
                    Book a Delivery
                  </Link>
                </div>
              </div>

              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-[#ab3500] opacity-20 rounded-full blur-3xl pointer-events-none" />
            </div>
          </section>

          {/* Stats */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statsCards.map((s) => <DriverStatsCard key={s.id} {...s} />)}
            </div>
          </section>

          {/* Active delivery — shown when driver has an accepted order in progress */}
          {activeOrder && (
            <section>
              <h3 className="text-lg font-black text-[#0F1923] mb-4">Active Delivery</h3>
              <Link href={`/driver/orders/${activeOrder.id}`}>
                <div className="bg-[#0F1923] rounded-3xl p-5 shadow-xl border border-slate-700 hover:opacity-95 transition-opacity active:scale-[0.99]">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        activeOrder.status === 'in_transit'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block bg-current" />
                      {activeOrder.status === 'in_transit' ? 'In Transit' : 'Processing'}
                    </span>
                    <span className="text-[#ff6b35] font-extrabold text-sm">{activeOrder.fare}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#ff6b35] mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Pickup</p>
                        <p className="text-slate-200 text-sm font-medium truncate">{activeOrder.pickup || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Dropoff</p>
                        <p className="text-slate-200 text-sm font-medium truncate">{activeOrder.dropoff || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-end">
                    <span className="text-[#ff6b35] font-bold text-xs">Continue delivery →</span>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Live offers — hidden while driver has an active delivery */}
          {isOnline && !activeOrder && (
            <section>
              <h3 className="text-lg font-black text-[#0F1923] mb-4">
                Incoming Offers
                {offers.length > 0 && (
                  <span className="ml-2 text-xs font-bold bg-[#ab3500] text-white rounded-full px-2 py-0.5">
                    {offers.length}
                  </span>
                )}
              </h3>

              {offerError && (
                <div
                  role="alert"
                  className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 flex items-start gap-3"
                >
                  <span className="flex-1">{offerError}</span>
                  <button
                    type="button"
                    onClick={() => setOfferError('')}
                    aria-label="Dismiss"
                    className="text-amber-600 hover:text-amber-900"
                  >
                    ×
                  </button>
                </div>
              )}

              {offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <DispatchOfferCard
                      key={offer.id}
                      offer={offer}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      accepting={acceptingId === offer.id}
                      rejecting={rejectingId === offer.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-slate-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">Waiting for offers…</p>
                  <p className="text-slate-400 text-xs mt-1">
                    The next nearby order will appear here in real time.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-[#0F1923]">Recent Activity</h3>
              <Link href="/driver/orders" className="text-[#ab3500] font-bold text-sm hover:underline">
                See All
              </Link>
            </div>
            {recentDeliveries.length > 0
              ? <DriverOrderList deliveries={recentDeliveries} />
              : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
                  <p className="text-slate-400 text-sm">No deliveries yet.</p>
                </div>
              )
            }
          </section>

          <section className="hidden lg:block">
            <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
              <h4 className="font-bold text-[#ab3500] mb-2">{PRO_TIP.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{PRO_TIP.body}</p>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Pure helpers ──────────────────────────────────────────────────────────

/**
 * Map the current GPS state to a UI descriptor object.
 * Called on every render — pure function, no side effects.
 */
function resolveGpsIndicator(isOnline, geoStatus, hasLiveLocation, geoError) {
  if (!isOnline) return {};

  if (geoStatus === 'available' && hasLiveLocation) {
    return {
      subtext:   'New offers will appear instantly when a customer near you places an order.',
      pill:      'GPS active',
      pillIcon:  '📍',
      pillClass: 'bg-emerald-500/20 text-emerald-300',
    };
  }

  if (geoStatus === 'acquiring') {
    return {
      subtext:   'Acquiring your location — offers will start arriving shortly.',
      pill:      'Getting GPS…',
      pillIcon:  '⏳',
      pillClass: 'bg-amber-500/20 text-amber-300',
    };
  }

  if (geoStatus === 'denied') {
    return {
      subtext:   'You\'re online. Enable location in your browser settings to get higher-priority offers.',
      pill:      'Location blocked',
      pillIcon:  '⚠️',
      pillClass: 'bg-red-500/20 text-red-300',
    };
  }

  if (geoStatus === 'unavailable') {
    return {
      subtext:   'You\'re online. GPS is temporarily unavailable — you may still receive offers.',
      pill:      geoError ?? 'GPS unavailable',
      pillIcon:  '📡',
      pillClass: 'bg-slate-500/30 text-slate-400',
    };
  }

  // 'idle' or first render before GPS settles
  return {
    subtext: 'New offers will appear instantly when a customer near you places an order.',
  };
}

/**
 * Fetch live offers for this driver on mount.
 * RLS limits results to offers addressed to the caller.
 */
async function fetchLiveOffers(driverId) {
  const { data } = await listLiveOffers(driverId);
  return (data ?? []).map(rowToOffer);
}

/**
 * Realtime INSERT events carry dispatch_offer fields only.
 * Hydrate with the joined order row before rendering.
 */
async function hydrateOfferRow(row) {
  const { data: order } = await getOfferOrderBrief(row.order_id);
  return rowToOffer({
    id:          row.id,
    distance_km: row.distance_km,
    expires_at:  row.expires_at,
    created_at:  row.created_at,
    order,
  });
}

function rowToOffer(row) {
  const o = row.order ?? {};
  return {
    id:         row.id,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    expiresAt:  row.expires_at,
    createdAt:  row.created_at,
    pickup:     o.pickup  ?? '',
    dropoff:    o.dropoff ?? '',
    fareRaw:    Number(o.fare_amount) || 0,
    package:    { type: o.package_type ?? 'parcel', weight: `${o.weight ?? 0} kg` },
  };
}
