'use client';

import { formatCurrency } from '@/lib/utils/format';

/** Itemised fare breakdown card shown on the checkout screen.
 *  Zero-amount rows are hidden so the card stays honest when admin
 *  hasn't configured a service fee, distance fee, etc.
 */
export default function PriceBreakdown({ baseFare, distanceFee, serviceFee, total }) {
  const lineItems = [
    { label: 'Vehicle Base Fare',      amount: baseFare    },
    { label: 'Weight Fee',             amount: distanceFee },
    { label: 'Service Fee',            amount: serviceFee  },
  ].filter((row) => Number(row.amount) > 0);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Fare Breakdown</h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="space-y-3">
          {lineItems.map(({ label, amount }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm text-slate-900 tabular-nums">{formatCurrency(amount)}</span>
            </div>
          ))}

          <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total Fare</span>
            <span className="text-2xl font-extrabold text-[#ff6b35] tracking-tight tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
