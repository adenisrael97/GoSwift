'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Fixed footer button shown at the bottom of the new-order form.
 * Displays the live fare estimate and advances to checkout on click.
 */
export default function SubmitButton({ isLoading, isDisabled, fareEstimate, onSubmit }) {
  return (
    <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-4 md:px-8 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Estimated Fare
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(fareEstimate)}
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isDisabled || isLoading}
          className="px-8 bg-[#ff6b35] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-orange-200"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
