'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info, HelpCircle } from 'lucide-react';

import { useOrder } from '@/context/OrderContext';
import ReceiverForm from '@/components/order/ReceiverForm';
import PageShell from '@/components/ui/PageShell';
import AppHeader from '@/components/ui/AppHeader';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Receiver' },
  { id: 3, label: 'Review' },
];

function OrderProgressStepper({ activeStep = 2 }) {
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
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-[#ff6b35]' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderAside() {
  return (
    <aside className="hidden lg:flex lg:col-span-5 flex-col gap-6 lg:sticky lg:top-28">
      <div className="rounded-3xl overflow-hidden h-80 relative border border-slate-200 shadow-lg bg-slate-50">
        <div className="absolute inset-0 bg-linear-to-br from-slate-100 via-emerald-50/30 to-emerald-100/20 flex items-center justify-center">
          <div className="text-center space-y-3 px-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">👤</span>
            </div>
            <p className="text-base font-bold text-slate-700">Quick Delivery Coordination</p>
            <p className="text-sm text-slate-400 leading-snug">
              Help your driver contact you or the recipient for smooth pickups and deliveries.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
        <div className="flex gap-3">
          <Info size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-900 mb-1 text-sm">Quick Tip</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Provide accurate recipient details so your driver can quickly locate them and complete the delivery.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function ReceiverPage() {
  const router = useRouter();
  const { draft, isHydrated } = useOrder();
  const shouldRedirect = isHydrated && !draft.pickup;

  useEffect(() => {
    if (shouldRedirect) router.replace('/dashboard/new-order');
  }, [shouldRedirect, router]);

  if (shouldRedirect) return null;

  return (
    <PageShell>
      <AppHeader
        backHref="/dashboard/new-order"
        title="New Order"
        rightSlot={
          <button className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 active:scale-95" aria-label="Help">
            <HelpCircle size={20} />
          </button>
        }
      />

      <OrderProgressStepper activeStep={2} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <ReceiverForm onSuccess={() => router.push('/dashboard/checkout')} />
          </div>
          <OrderAside />
        </div>
      </main>
    </PageShell>
  );
}

