'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Primary checkout action button.
 *
 * Props:
 *   total       — numeric amount to display when showAmount is true
 *   isLoading   — shows a spinner and disables the button
 *   isDisabled  — disables the button without the loading state
 *   onPay       — click handler
 *   showAmount  — whether to include the formatted amount in the label
 */
export default function PayButton({ total, isLoading, isDisabled, onPay, showAmount = true }) {
  const label = showAmount ? `Confirm & Pay ${formatCurrency(total)}` : 'Confirm & Pay';

  return (
    <button
      type="button"
      onClick={onPay}
      disabled={isDisabled || isLoading}
      className="w-full bg-[#ff6b35] text-white font-bold py-4 rounded-2xl shadow-[0_8px_24px_-4px_rgba(255,107,53,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}
