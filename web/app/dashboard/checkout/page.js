'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShieldCheck, AlertCircle } from 'lucide-react';

import { useOrder } from '@/context/OrderContext';
import { formatCurrency } from '@/lib/utils/format';
import { createOrder, initializePayment } from '@/lib/api';
import { DEFAULT_VEHICLE_PRICING } from '@/lib/pricing/vehicleRates';
import { usePricing } from '@/lib/pricing/usePricing';

import CheckoutSummary from '@/components/payment/CheckoutSummary';
import PriceBreakdown  from '@/components/payment/PriceBreakdown';
import PayButton       from '@/components/payment/PayButton';
import PageShell       from '@/components/ui/PageShell';
import AppHeader       from '@/components/ui/AppHeader';
import Toast           from '@/components/ui/Toast';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Splits the saved fareEstimate into vehicle-base + weight-charge rows so the
 * user sees what they're paying for. Total is preserved exactly — the split
 * comes from the same admin pricing used at order time.
 */
function buildFareBreakdown(fareEstimate, vehicleId, pricing) {
  const rate = pricing[vehicleId] ?? DEFAULT_VEHICLE_PRICING[vehicleId] ?? DEFAULT_VEHICLE_PRICING.car;
  const baseFare    = Number(rate.baseFare) || 0;
  const distanceFee = Math.max(0, Number(fareEstimate) - baseFare);
  return { baseFare, distanceFee, serviceFee: 0, total: Number(fareEstimate) || 0 };
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Spinner shown while context hydrates from sessionStorage. */
function HydrationSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#ff6b35] rounded-full animate-spin" />
    </div>
  );
}

/** Fallback UI when no pending order exists in context. */
function NoOrderFallback({ onCreateNew }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-5 px-6">
      <AlertCircle size={48} className="text-slate-300" />
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-slate-900">No order found</h2>
        <p className="text-sm text-slate-500">Your session may have expired. Please create a new order.</p>
      </div>
      <button
        onClick={onCreateNew}
        className="px-6 py-3 bg-[#ff6b35] text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors active:scale-95"
      >
        Create New Order
      </button>
    </div>
  );
}

/** Full-screen overlay shown while the payment is being confirmed. */
function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-100 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 max-w-70 w-full flex flex-col items-center text-center shadow-2xl">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div className="absolute inset-0 rounded-full border-4 border-[#ff6b35] border-t-transparent animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Processing...</h3>
        <p className="text-sm text-slate-500 leading-relaxed">Confirming your order.</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { draft, isHydrated, confirmOrder, resetDraft } = useOrder();
  const pricing = usePricing();

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [hasSubmitted,  setHasSubmitted]  = useState(false);
  const [successMsg,    setSuccessMsg]    = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');

  // hasSubmitted is read during render to suppress the "No order found"
  // fallback during the redirect delay, after confirmOrder() clears the
  // draft. State (not a ref) so reading it in render is safe.
  const redirectTimerRef = useRef(null);

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const hasDraft = isHydrated && draft.pickup && draft.dropoff;

  // Shared order fields — same shape for both the existing route and the
  // new Paystack initialize route (minus paymentMethod, handled per-branch).
  function buildOrderPayload() {
    return {
      pickup:       draft.pickup,
      pickupLat:    draft.pickupLat,
      pickupLng:    draft.pickupLng,
      dropoff:      draft.dropoff,
      dropoffLat:   draft.dropoffLat,
      dropoffLng:   draft.dropoffLng,
      packageType:  draft.packageType,
      vehicleType:  draft.vehicle ?? 'car',
      weight:       draft.weight,
      note:         draft.note,
      fareEstimate: draft.fareEstimate,
      senderPhone:  draft.senderPhone  || undefined,
      receiverName: draft.receiverName  || undefined,
      receiverPhone: draft.receiverPhone || undefined,
    };
  }

  async function handlePayment() {
    if (!hasDraft || !paymentMethod) return;

    setErrorMsg('');
    setIsProcessing(true);

    // ── Card: Paystack hosted checkout ──────────────────────────────────
    if (paymentMethod === 'card') {
      const { ok, body } = await initializePayment(buildOrderPayload());

      if (!ok) {
        setErrorMsg(body?.error ?? 'Payment initialisation failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Draft cleared so the user can't submit a duplicate on back-navigation.
      setHasSubmitted(true);
      resetDraft();
      // Full browser navigation to Paystack's hosted checkout.
      // router.push would be intercepted by Next.js; we need a real redirect.
      window.location.href = body.authorizationUrl;
      return;
    }

    // ── Cash / Transfer: existing direct-confirmation flow ──────────────
    const { ok, body } = await createOrder(
      { ...buildOrderPayload(), paymentMethod },
      // Stable per-draft key — a retried Pay click returns the original order.
      { idempotencyKey: draft.idempotencyKey ?? undefined },
    );

    if (!ok) {
      setErrorMsg(body?.error ?? 'Failed to place order. Please try again.');
      // Release the overlay on failure — leaving it up would freeze the UI.
      setIsProcessing(false);
      return;
    }

    setHasSubmitted(true);
    confirmOrder({ paymentMethod, id: body.order.id });
    setSuccessMsg('Order placed! Redirecting...');
    redirectTimerRef.current = setTimeout(() => router.push('/dashboard'), 1500);
    // Overlay stays up through the redirect — releasing it exposes the
    // NoOrderFallback because confirmOrder() has just emptied the draft.
  }

  if (!isHydrated) return <HydrationSpinner />;
  if (!hasDraft && !hasSubmitted && !isProcessing) {
    return <NoOrderFallback onCreateNew={() => router.push('/dashboard/new-order')} />;
  }

  const fare = buildFareBreakdown(draft.fareEstimate, draft.vehicle ?? 'car', pricing);

  return (
    <>
      <PageShell>
        <AppHeader
          backHref="/dashboard/new-order"
          title="Checkout"
          rightSlot={
            <button className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 active:scale-95" aria-label="Notifications">
              <Bell size={20} />
            </button>
          }
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-40 lg:pb-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">

            {/* Left: order summary + payment method selector */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              <CheckoutSummary
                order={draft}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
              />
            </div>

            {/* Right: fare breakdown + desktop CTA */}
            <div className="lg:col-span-5 xl:col-span-4 mt-8 lg:mt-0">
              <div className="lg:sticky lg:top-24 space-y-6">
                <PriceBreakdown {...fare} />

                <div className="hidden lg:block bg-white rounded-2xl p-6 shadow-xl border border-slate-100 space-y-5">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Secured Transaction</span>
                  </div>
                  <PayButton total={fare.total} isLoading={isProcessing} isDisabled={!paymentMethod} onPay={handlePayment} showAmount />
                  <p className="text-center text-xs text-slate-400">
                    By clicking, you agree to our{' '}
                    <span className="underline cursor-pointer hover:text-slate-600">Terms of Service</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </PageShell>

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 pt-4 pb-8 lg:hidden shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">To Pay</span>
              <p className="text-xl font-extrabold text-slate-900 tabular-nums">{formatCurrency(fare.total)}</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-500">
              <ShieldCheck size={15} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Secured</span>
            </div>
          </div>
          <PayButton total={fare.total} isLoading={isProcessing} isDisabled={!paymentMethod} onPay={handlePayment} showAmount={false} />
        </div>
      </div>

      {/* Overlays & toasts */}
      {isProcessing && <ProcessingOverlay />}
      <Toast message={successMsg} variant="success" />
      <Toast message={errorMsg}   variant="error" onClose={() => setErrorMsg('')} />
    </>
  );
}
