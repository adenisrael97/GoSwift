'use client';

import { MapPin, Package } from 'lucide-react';
import { PACKAGE_LABELS, VEHICLE_LABELS, VEHICLE_EMOJIS } from '@/lib/utils/order';

/** Order route + package summary shown at the top of the checkout screen. */
export default function OrderReviewCard({ pickup, dropoff, packageType, vehicleType, weight }) {
  const vehicleLabel = VEHICLE_LABELS[vehicleType] ?? 'Car';
  const vehicleEmoji = VEHICLE_EMOJIS[vehicleType] ?? '🚗';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
        <div className="px-3 py-1 bg-orange-50 rounded-full border border-orange-100 flex items-center gap-1.5">
          <span>{vehicleEmoji}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff6b35]">
            {vehicleLabel}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        {/* Route visualisation */}
        <div className="relative flex flex-col gap-6">
          <div className="absolute left-2.75 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-slate-200" />

          {/* Pickup */}
          <div className="flex gap-4 relative z-10">
            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center border-4 border-slate-100 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Pick Up</span>
              <span className="text-sm font-semibold text-slate-900 leading-snug">{pickup}</span>
            </div>
          </div>

          {/* Dropoff */}
          <div className="flex gap-4 relative z-10">
            <div className="w-6 h-6 rounded-full bg-[#ff6b35] flex items-center justify-center border-4 border-orange-100 shrink-0">
              <MapPin size={10} className="text-white fill-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Drop Off</span>
              <span className="text-sm font-semibold text-slate-900 leading-snug">{dropoff}</span>
            </div>
          </div>
        </div>

        {/* Package + vehicle row */}
        <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center">
              <Package size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{PACKAGE_LABELS[packageType] ?? 'Package'}</p>
              <p className="text-xs text-slate-400">{weight} kg · Est. 25–40 mins</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#ff6b35] bg-orange-50 px-2.5 py-1 rounded-full">
            {vehicleEmoji} {vehicleLabel}
          </span>
        </div>
      </div>
    </section>
  );
}
