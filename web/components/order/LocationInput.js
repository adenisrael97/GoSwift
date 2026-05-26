'use client';

import { Navigation, MapPin } from 'lucide-react';

export default function LocationInput({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  errors,
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
        Route Details
      </h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex gap-4">
          {/* Visual route connector */}
          <div className="flex flex-col items-center pt-3 shrink-0">
            <Navigation size={18} className="text-[#ff6b35]" />
            <div className="w-px h-10 border-l-2 border-dashed border-slate-200 my-1" />
            <MapPin size={18} className="text-emerald-500" />
          </div>

          <div className="flex-1 space-y-6">
            {/* Pickup */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                Pickup Location
              </label>
              <input
                type="text"
                value={pickup}
                onChange={(e) => onPickupChange(e.target.value)}
                placeholder="Enter pickup address..."
                className={`w-full text-sm font-medium text-slate-900 bg-transparent border-b pb-1.5 outline-none placeholder:text-slate-300 transition-colors ${
                  errors.pickup
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-200 focus:border-[#ff6b35]'
                }`}
              />
              {errors.pickup && (
                <p className="text-xs text-red-500 mt-1">{errors.pickup}</p>
              )}
            </div>

            {/* Dropoff */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                Dropoff Location
              </label>
              <input
                type="text"
                value={dropoff}
                onChange={(e) => onDropoffChange(e.target.value)}
                placeholder="Enter destination address..."
                className={`w-full text-sm font-medium text-slate-900 bg-transparent border-b pb-1.5 outline-none placeholder:text-slate-300 transition-colors ${
                  errors.dropoff
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-200 focus:border-[#ff6b35]'
                }`}
              />
              {errors.dropoff && (
                <p className="text-xs text-red-500 mt-1">{errors.dropoff}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
