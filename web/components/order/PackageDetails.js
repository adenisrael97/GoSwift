'use client';

import { Package, UtensilsCrossed, Box } from 'lucide-react';

const PACKAGE_TYPES = [
  { id: 'parcel', icon: Package, label: 'Parcel' },
  { id: 'food', icon: UtensilsCrossed, label: 'Food' },
  { id: 'bulky', icon: Box, label: 'Bulky' },
];

export default function PackageDetails({
  packageType,
  weight,
  onPackageTypeChange,
  onWeightChange,
}) {
  return (
    <div className="space-y-8">
      {/* Package Type */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
          Package Type
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {PACKAGE_TYPES.map(({ id, icon: Icon, label }) => {
            const isActive = packageType === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPackageTypeChange(id)}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all active:scale-95 ${
                  isActive
                    ? 'border-[#ff6b35] bg-orange-50 shadow-md ring-4 ring-orange-100'
                    : 'border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/50'
                }`}
              >
                <Icon
                  size={24}
                  className={`mb-2.5 transition-colors ${
                    isActive ? 'text-[#ff6b35]' : 'text-slate-400'
                  }`}
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    isActive ? 'text-[#ff6b35]' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Weight Slider */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
            Estimated Weight
          </h2>
          <span className="text-[#ff6b35] font-extrabold text-xl tabular-nums">
            {weight}
            <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={weight}
            onChange={(e) => onWeightChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#ff6b35]"
          />
          <div className="flex justify-between mt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">0 kg</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">25 kg</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">50 kg+</span>
          </div>
        </div>
      </section>
    </div>
  );
}
