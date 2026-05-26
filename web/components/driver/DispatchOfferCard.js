'use client';

import { useEffect, useState } from 'react';
import { MapPin, Package, Navigation, X, Check } from 'lucide-react';

import { formatCurrency } from '@/lib/utils/format';

/**
 * DispatchOfferCard — single dispatch offer presented to a driver.
 *
 * Owns the live countdown timer. When `expires_at` is reached, the
 * card greys out and the parent removes it from state via the realtime
 * UPDATE event (or proactively, when the timer hits zero).
 */
export default function DispatchOfferCard({ offer, onAccept, onReject, accepting, rejecting }) {
  const expiresAtMs   = new Date(offer.expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  // Tick once per second — the visible countdown is whole seconds, so
  // 250ms was 4× the work for the same UI. setInterval auto-stops when
  // the component unmounts via the cleanup.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs   = Math.max(0, expiresAtMs - now);
  const remainingSec  = Math.ceil(remainingMs / 1000);
  const expired       = remainingMs <= 0;
  const totalTtlMs    = expiresAtMs - new Date(offer.createdAt).getTime();
  const progress      = totalTtlMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalTtlMs)) : 0;
  const busy          = accepting || rejecting;

  return (
    <div className={`bg-white rounded-3xl border ${expired ? 'border-slate-200 opacity-60' : 'border-orange-200'} shadow-sm p-5 transition-all`}>
      {/* Timer bar */}
      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full ${expired ? 'bg-slate-300' : 'bg-[#ab3500]'} transition-all`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New offer</div>
          <div className="text-lg font-black text-[#0F1923] mt-1">{formatCurrency(offer.fareRaw)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance</div>
          <div className="text-base font-bold text-[#0F1923] mt-1">
            {offer.distanceKm != null ? `${offer.distanceKm} km` : '—'}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-orange-50 border-2 border-[#ab3500] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#ab3500] uppercase tracking-widest">Pickup</p>
            <p className="text-sm font-semibold text-[#0F1923] truncate">{offer.pickup || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Navigation size={20} className="text-slate-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dropoff</p>
            <p className="text-sm font-semibold text-[#0F1923] truncate">{offer.dropoff || '—'}</p>
          </div>
        </div>
      </div>

      {offer.package && (
        <div className="flex items-center gap-2 mb-5">
          <Package size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500">
            {offer.package.type} · {offer.package.weight}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => onReject(offer.id)}
          disabled={busy || expired}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <X size={16} />
          {rejecting ? 'Declining…' : 'Decline'}
        </button>
        <button
          onClick={() => onAccept(offer.id)}
          disabled={busy || expired}
          className="flex-1 py-3 rounded-xl bg-[#ab3500] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_20px_-6px_rgba(171,53,0,0.4)] transition-all"
        >
          <Check size={16} />
          {accepting ? 'Accepting…' : expired ? 'Expired' : `Accept · ${remainingSec}s`}
        </button>
      </div>
    </div>
  );
}
