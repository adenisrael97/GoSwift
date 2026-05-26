/**
 * /dashboard/orders/[id]/summary — order summary / receipt (Server Component).
 *
 * Pure read; no interactivity beyond Links. Migrated from a 'use client'
 * useEffect-fetch page in Sprint 3 so the receipt arrives inline with
 * the HTML on first paint — important for the post-purchase moment when
 * the customer expects instant confirmation.
 */
import Link from 'next/link';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react';

import { requireAuthRSC }       from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase }     from '@/lib/server/supabase.admin';
import { mapDbOrder }           from '@/lib/utils/mapOrder';

import ReceiptCard   from '@/components/orders/ReceiptCard';
import AppHeader     from '@/components/ui/AppHeader';
import PageShell     from '@/components/ui/PageShell';
import OrderNotFound from '@/components/ui/OrderNotFound';

const STATUS_CONTENT = {
  delivered: {
    icon:    <CheckCircle size={48} className="text-emerald-500" strokeWidth={1.5} />,
    bg:      'bg-emerald-50',
    heading: 'Order Delivered!',
    body:    'Your package has been safely dropped off. Thank you for using GoSwift!',
  },
  cancelled: {
    icon:    <XCircle size={48} className="text-slate-400" strokeWidth={1.5} />,
    bg:      'bg-slate-100',
    heading: 'Order Cancelled',
    body:    'This order was cancelled. If you were charged, a refund has been initiated to your GoSwift Wallet.',
  },
};

const DEFAULT_CONTENT = {
  icon:    <CheckCircle size={48} className="text-emerald-500" strokeWidth={1.5} />,
  bg:      'bg-emerald-50',
  heading: 'Order Placed!',
  body:    'Your courier is being assigned. Share the PIN only when the package is collected.',
};

const RECEIPT_COLUMNS = `
  *,
  driver:profiles!orders_driver_id_fkey (
    full_name, phone,
    driver_profiles ( rating, total_trips, vehicle_model )
  )
`;

/**
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function OrderSummaryPage({ params }) {
  const auth = await requireAuthRSC();
  const { id } = await params;

  const { data: row } = await getAdminSupabase()
    .from('orders')
    .select(RECEIPT_COLUMNS)
    .eq('id', id)
    .eq('user_id', auth.userId)
    .single();

  if (!row) return <OrderNotFound />;

  const order = mapDbOrder(row);
  const content = STATUS_CONTENT[order.status] ?? DEFAULT_CONTENT;

  return (
    <PageShell>
      <AppHeader
        rightSlot={
          <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors" aria-label="Help">
            <HelpCircle size={20} />
          </button>
        }
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6">

        {/* Hero */}
        <section className="flex flex-col items-center text-center mb-10">
          <div className={`w-20 h-20 ${content.bg} rounded-full flex items-center justify-center mb-5`}>
            {content.icon}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            {content.heading}
          </h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {content.body}
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left: PIN (if any) + Route */}
          <div className="md:col-span-7 space-y-4">

            {/* PIN card — only shown when the order has a PIN */}
            {order.pin && order.status !== 'cancelled' && (
              <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-tr from-[#ab3500]/20 to-transparent pointer-events-none rounded-2xl" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-4">
                    Pickup Verification PIN
                  </span>
                  <span className="text-6xl font-black text-white tracking-[0.3em] font-mono">
                    {order.pin}
                  </span>
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      ⚠ Do not share over the phone
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Route card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="relative">
                <div className="absolute left-2.5 top-5 bottom-5 w-0 border-l-2 border-dashed border-slate-200 z-0" />
                <div className="flex flex-col gap-5">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-orange-50 border-2 border-[#ab3500] flex items-center justify-center shrink-0 z-10 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#ab3500]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#ab3500] uppercase tracking-widest block mb-0.5">Pickup</span>
                      <span className="text-sm font-medium text-slate-900">{order.pickup.address}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center shrink-0 z-10 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-slate-500" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Dropoff</span>
                      <span className="text-sm font-medium text-slate-900">{order.dropoff.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Info bento + Receipt + Actions */}
          <div className="md:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-xl p-4">
                <span className="text-xl block mb-1">{order.emoji}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Package</span>
                <span className="text-sm font-bold text-slate-900">{order.package.type}</span>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <span className="text-xl block mb-1">💳</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Paid</span>
                <span className="text-sm font-bold text-slate-900">{order.payment.total}</span>
              </div>
            </div>

            <ReceiptCard payment={order.payment} />

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/orders"
                className="w-full py-3.5 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold text-center hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                ← Back to Orders
              </Link>
              <Link
                href="/dashboard"
                className="w-full py-3 text-slate-400 text-sm font-bold text-center hover:text-slate-700 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-6 flex flex-col items-center gap-2 bg-white border-t border-slate-100 mt-8">
        <span className="text-[#ff6b35] font-black text-xl">GoSwift</span>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
          © 2024 GoSwift Logistics Nigeria
        </p>
      </footer>
    </PageShell>
  );
}
