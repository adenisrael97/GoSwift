'use client';

/**
 * Inline toast notification that slides in from the top.
 *
 * Props:
 *   message  — text to display
 *   variant  — "success" | "error"  (defaults to "success")
 *   onClose  — called when the X button is clicked
 */

import { Check, AlertCircle, X } from 'lucide-react';

const VARIANTS = {
  success: {
    wrapper: 'bg-slate-900 text-white',
    icon:    <div className="bg-emerald-500 rounded-full p-1 shrink-0"><Check size={14} strokeWidth={3} className="text-white" /></div>,
  },
  error: {
    wrapper: 'bg-red-600 text-white',
    icon:    <AlertCircle size={18} className="shrink-0" />,
  },
};

/**
 * @param {object} props
 * @param {string} [props.message]
 * @param {'success'|'error'} [props.variant]
 * @param {() => void} [props.onClose]
 */
export default function Toast({ message, variant = 'success', onClose }) {
  if (!message) return null;

  const { wrapper, icon } = VARIANTS[variant] ?? VARIANTS.success;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-[400px] px-4 z-[60]">
      <div className={`${wrapper} px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up`}>
        {icon}
        <p className="text-sm font-medium">{message}</p>
        {onClose && (
          <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
