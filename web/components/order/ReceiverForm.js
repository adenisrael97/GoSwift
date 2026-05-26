'use client';

import { useState } from 'react';
import { User, Phone } from 'lucide-react';

import { useOrder } from '@/context/OrderContext';
import { ArrowRight, Loader2 } from 'lucide-react';

const PHONE_REGEX = /^\+?[\d\s\-]{7,15}$/;

export default function ReceiverForm({ onSuccess }) {
  const { draft, updateDraft } = useOrder();
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = draft.receiverName.trim() !== '' && draft.receiverPhone.trim() !== '';

  function setField(key, value) {
    updateDraft({ [key]: value });
  }

  function validate() {
    /** @type {Record<string, string>} */
    const next = {};
    if (!draft.receiverName?.trim()) {
      next.receiverName = 'Recipient name is required';
    }
    if (!draft.receiverPhone?.trim()) {
      next.receiverPhone = 'Recipient phone is required';
    } else if (!PHONE_REGEX.test(draft.receiverPhone.trim())) {
      next.receiverPhone = 'Invalid phone format';
    }
    if (draft.senderPhone && !PHONE_REGEX.test(draft.senderPhone.trim())) {
      next.senderPhone = 'Invalid phone format';
    }
    return next;
  }

  async function handleSubmit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);
    setIsLoading(false);
    onSuccess();
  }

  return (
    <>
      <div className="space-y-8">
        {/* Sender Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
            Sender Details
            <span className="text-xs font-normal text-slate-400">(optional)</span>
          </h2>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Your Phone Number
              </label>
              <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#ff6b35]/20 focus-within:border-[#ff6b35]">
                <Phone size={16} className="text-slate-400" />
                <input
                  type="tel"
                  value={draft.senderPhone}
                  onChange={(e) => setField('senderPhone', e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-300"
                />
              </div>
              {errors.senderPhone && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.senderPhone}</p>
              )}
            </div>
          </div>
        </section>

        {/* Recipient Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
            Recipient Details
          </h2>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Recipient Name
              </label>
              <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#ff6b35]/20 focus-within:border-[#ff6b35]">
                <User size={16} className="text-slate-400" />
                <input
                  type="text"
                  value={draft.receiverName}
                  onChange={(e) => setField('receiverName', e.target.value)}
                  placeholder="Full name of recipient"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-300"
                />
              </div>
              {errors.receiverName && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.receiverName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Recipient Phone
              </label>
              <div className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#ff6b35]/20 focus-within:border-[#ff6b35]">
                <Phone size={16} className="text-slate-400" />
                <input
                  type="tel"
                  value={draft.receiverPhone}
                  onChange={(e) => setField('receiverPhone', e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-300"
                />
              </div>
              {errors.receiverPhone && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.receiverPhone}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-4 md:px-8 shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
        <div className="max-w-7xl mx-auto flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="px-8 bg-[#ff6b35] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-orange-200"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Continue to Review</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </footer>
    </>
  );
}
