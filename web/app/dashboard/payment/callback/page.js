'use client';

/**
 * /dashboard/payment/callback
 *
 * Landing page after Paystack redirects the browser back.
 * Paystack appends ?reference=<ORDER_UUID>&trxref=<ORDER_UUID>.
 *
 * Flow:
 *   1. Reads `reference` from the URL (client-side, inside useEffect)
 *   2. Calls POST /api/payments/verify
 *   3. On success → shows confirmation → navigates to /dashboard/orders/:id
 *   4. On failure → shows error with a "Try Again" link
 *
 * This page is intentionally minimal — it has no nav chrome so the user
 * focus stays on the outcome. No layout is applied by the file system
 * because payment/layout.js is not defined, so it inherits dashboard/layout.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter }                   from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authedFetch }                 from '@/lib/api';

// ── Sub-views ────────────────────────────────────────────────────────────────

function VerifyingView() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 size={48} className="animate-spin text-[#ff6b35] mx-auto" />
        <p className="text-slate-600 font-semibold text-lg">Verifying payment…</p>
        <p className="text-slate-400 text-sm">Please do not close this page.</p>
      </div>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <CheckCircle size={56} className="text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-extrabold text-slate-900">Payment Successful!</h1>
        <p className="text-slate-500 text-sm">Redirecting to your order…</p>
      </div>
    </div>
  );
}

function FailedView({ onRetry }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm">
        <XCircle size={56} className="text-red-400 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Payment Failed</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Your payment could not be verified. Please try again or choose a different payment method.
        </p>
        <button
          onClick={onRetry}
          className="w-full px-6 py-3 bg-[#ff6b35] text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors active:scale-95"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentCallbackPage() {
  const router       = useRouter();
  const hasRun       = useRef(false);
  const [view, setView]       = useState('verifying');
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    // Strict Mode fires effects twice in development; the ref prevents a
    // double verification call that could confuse error handling.
    if (hasRun.current) return;
    hasRun.current = true;

    // Read reference from URL — safe inside useEffect (browser-only).
    const params    = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('failed');
      return;
    }

    authedFetch('/api/payments/verify', {
      method: 'POST',
      body:   JSON.stringify({ reference }),
    })
      .then(({ ok, body }) => {
        if (ok && body?.success) {
          setOrderId(body.orderId);
          setView('success');
        } else {
          setView('failed');
        }
      })
      .catch(() => setView('failed'));
  }, []);

  // Navigate to the order detail page after showing success briefly
  useEffect(() => {
    if (view !== 'success' || !orderId) return;
    const timer = setTimeout(
      () => router.replace(`/dashboard/orders/${orderId}`),
      2000,
    );
    return () => clearTimeout(timer);
  }, [view, orderId, router]);

  if (view === 'success')    return <SuccessView />;
  if (view === 'failed')     return <FailedView onRetry={() => router.push('/dashboard/new-order')} />;
  return <VerifyingView />;
}
