'use client';

import { CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';

const METHODS = [
  {
    id: 'card',
    Icon: CreditCard,
    label: 'Pay with Card',
    sub: 'Secure online payment',
    recommended: true,
    darkWhenActive: true,
  },
  {
    id: 'cash',
    Icon: Banknote,
    label: 'Cash on Delivery',
    sub: 'Pay when order arrives',
    recommended: false,
    darkWhenActive: false,
  },
  {
    id: 'transfer',
    Icon: ArrowLeftRight,
    label: 'Bank Transfer',
    sub: 'Transfer before pickup',
    recommended: false,
    darkWhenActive: false,
  },
];

export default function PaymentMethodSelector({ selected, onSelect }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Payment Method</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {METHODS.map(({ id, Icon, label, sub, recommended, darkWhenActive }) => {
          const isSelected = selected === id;
          const isDark = isSelected && darkWhenActive;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] flex items-center justify-between gap-3 ${
                isDark
                  ? 'bg-slate-900 border-[#ff6b35] shadow-lg'
                  : isSelected
                  ? 'bg-orange-50 border-[#ff6b35] shadow-sm'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Icon container */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-white/10' : isSelected ? 'bg-[#ff6b35]/10' : 'bg-slate-50'
                  }`}
                >
                  <Icon
                    size={20}
                    className={isDark ? 'text-white' : isSelected ? 'text-[#ff6b35]' : 'text-slate-500'}
                  />
                </div>

                {/* Label + sub */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {label}
                    </span>
                    {recommended && (
                      <span className="bg-[#ff6b35] text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                        Recommended
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 leading-none">{sub}</span>
                </div>
              </div>

              {/* Radio indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'border-[#ff6b35] bg-[#ff6b35]' : 'border-slate-200 bg-white'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
