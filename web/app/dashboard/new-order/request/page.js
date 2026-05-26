'use client';

import { useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';

import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';
import { REQUEST_VEHICLE_IDS, VEHICLE_RATES, computeFare } from '@/lib/pricing/vehicleRates';
import { usePricing } from '@/lib/pricing/usePricing';
import { formatCurrency } from '@/lib/utils/format';

// Sample weight used purely for the indicative "from ₦X" label on each card.
// The real fare is recalculated on the details page once the user enters weight.
const SAMPLE_WEIGHT_KG = 5;

export default function RequestVehiclePage() {
  const router  = useRouter();
  const pricing = usePricing();

  function handlePick(vehicleId) {
    router.push(`/dashboard/new-order?vehicle=${vehicleId}`);
  }

  return (
    <PageShell>
      <AppHeader
        backHref="/dashboard"
        title="Request a Vehicle"
        rightSlot={
          <button
            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 active:scale-95"
            aria-label="Help"
          >
            <HelpCircle size={20} />
          </button>
        }
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-12">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-slate-900">What are you sending?</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pick the vehicle that fits your load. Indicative price shown — final
            fare depends on the weight you enter next.
          </p>
        </div>

        <div className="space-y-3">
          {REQUEST_VEHICLE_IDS.map((id) => {
            const v    = VEHICLE_RATES[id];
            const fare = computeFare(id, SAMPLE_WEIGHT_KG, pricing);

            return (
              <button
                key={id}
                type="button"
                onClick={() => handlePick(id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 bg-white text-left transition-all hover:border-orange-200 hover:bg-orange-50/40 active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-slate-50">
                  {v.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-slate-900">{v.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{v.hint}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-1">
                    Up to {v.maxWeight} kg
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    From
                  </p>
                  <p className="text-lg font-extrabold tabular-nums text-slate-700">
                    {formatCurrency(fare)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </PageShell>
  );
}
