'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Info, HelpCircle, Edit3 } from 'lucide-react';

import OrderForm from '@/components/order/OrderForm';
import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';
import { useOrder } from '@/context/OrderContext';
import { VEHICLE_RATES, VEHICLE_IDS } from '@/lib/pricing/vehicleRates';

// 3-step stepper: vehicle is chosen before this page, so it's no longer a step.
const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Receiver' },
  { id: 3, label: 'Review' },
];

function OrderProgressStepper({ activeStep = 1 }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 py-8">
      <div className="flex justify-between items-center relative">
        <div className="absolute top-5 left-[calc(16.66%)] right-[calc(16.66%)] h-0.5 bg-slate-100 -z-10" />
        {STEPS.map((step) => {
          const isActive = step.id === activeStep;
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2 z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                  isActive
                    ? 'bg-[#ff6b35] text-white shadow-md shadow-orange-200'
                    : 'bg-orange-50 text-[#ff6b35]'
                }`}
              >
                {step.id}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  isActive ? 'text-[#ff6b35]' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VehicleChip({ vehicleId }) {
  const v = VEHICLE_RATES[vehicleId];
  if (!v) return null;

  // Bike has its own dashboard entry, so its "change" link goes back home;
  // any other vehicle was picked on /request, so that's the right return path.
  const changeHref = vehicleId === 'bike' ? '/dashboard' : '/dashboard/new-order/request';

  return (
    <div className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0">{v.emoji}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ab3500]">Vehicle</p>
          <p className="text-sm font-bold text-slate-900 truncate">{v.label}</p>
        </div>
      </div>
      <Link
        href={changeHref}
        className="flex items-center gap-1.5 text-[#ff6b35] text-xs font-bold uppercase tracking-widest hover:underline shrink-0"
      >
        <Edit3 size={14} /> Change
      </Link>
    </div>
  );
}

function OrderAside() {
  return (
    <aside className="hidden lg:flex lg:col-span-5 flex-col gap-6 lg:sticky lg:top-28">
      <div className="rounded-3xl overflow-hidden h-80 relative border border-slate-200 shadow-lg bg-slate-50">
        <div className="absolute inset-0 bg-linear-to-br from-slate-100 via-orange-50/30 to-orange-100/20 flex items-center justify-center">
          <div className="text-center space-y-3 px-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🚚</span>
            </div>
            <p className="text-base font-bold text-slate-700">Fast & Reliable Delivery</p>
            <p className="text-sm text-slate-400 leading-snug">
              Your package will be picked up and delivered safely by a verified driver.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
        <div className="flex gap-3">
          <Info size={18} className="text-[#ff6b35] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-900 mb-1 text-sm">Quick Tip</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Accurate weight helps us assign the best vehicle for your delivery,
              ensuring your items arrive safely and on time.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NewOrderContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { draft, updateDraft, isHydrated } = useOrder();

  // Single source of truth for the chosen vehicle on this page: prefer
  // ?vehicle= when present (entering from dashboard or /request), otherwise
  // fall back to whatever was already in the draft.
  const queryVehicle = searchParams.get('vehicle');
  const validQuery   = queryVehicle && VEHICLE_IDS.includes(queryVehicle) ? queryVehicle : null;
  const activeVehicle = validQuery ?? draft.vehicle;

  // Persist the query-param vehicle into the draft once hydration finishes,
  // so downstream pages (receiver, checkout) see it without re-reading the URL.
  useEffect(() => {
    if (!isHydrated) return;
    if (validQuery && draft.vehicle !== validQuery) {
      updateDraft({ vehicle: validQuery });
    }
  }, [isHydrated, validQuery, draft.vehicle, updateDraft]);

  // If we land here without any vehicle context, the user skipped the entry
  // funnel — bounce them to the picker. Bike has its own dashboard tile so we
  // don't auto-pick it here.
  useEffect(() => {
    if (!isHydrated) return;
    if (!activeVehicle) router.replace('/dashboard/new-order/request');
  }, [isHydrated, activeVehicle, router]);

  if (!isHydrated || !activeVehicle) return null;

  return (
    <PageShell>
      <AppHeader
        backHref="/dashboard"
        title="New Order"
        rightSlot={
          <button
            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 active:scale-95"
            aria-label="Help"
          >
            <HelpCircle size={20} />
          </button>
        }
      />

      <OrderProgressStepper activeStep={1} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <VehicleChip vehicleId={activeVehicle} />
            <OrderForm
              vehicleId={activeVehicle}
              onSuccess={() => router.push('/dashboard/new-order/receiver')}
            />
          </div>
          <OrderAside />
        </div>
      </main>
    </PageShell>
  );
}

// useSearchParams() bails out of static prerendering, so the page body must sit
// behind a Suspense boundary for `next build` to prerender this route.
export default function NewOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewOrderContent />
    </Suspense>
  );
}
