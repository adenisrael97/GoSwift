'use client';

import { MapPin, Loader2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

export default function PickupCoordinatesSection({ status, coords, error, onRequest }) {
  const isLoading = status === 'requesting';
  const hasSuccess = status === 'success';
  const hasError = status === 'error';

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={onRequest}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={
          hasSuccess
            ? 'Pickup location confirmed'
            : hasError
            ? 'Retry location capture'
            : 'Use current location for pickup'
        }
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98] ${
          hasSuccess
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : hasError
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-[#ff6b35] bg-orange-50 text-[#ab3500] hover:bg-orange-100'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Reading your location…
          </>
        ) : hasSuccess ? (
          <>
            <CheckCircle2 size={16} />
            Pickup pinned · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </>
        ) : hasError ? (
          <>
            <RotateCcw size={16} />
            Try again
          </>
        ) : (
          <>
            <MapPin size={16} />
            Use my current location for pickup
          </>
        )}
      </button>

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-700 font-medium">{error?.message}</p>
              <p className="text-xs text-red-600 mt-1.5">
                No worries — your pickup address above will be used for dispatch.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasSuccess && !hasError && (
        <p className="text-xs text-slate-400">
          We&apos;ll use this to find the nearest driver. Or just type your address above.
        </p>
      )}
    </section>
  );
}
