'use client';

import Link from 'next/link';
import { Package, PackageOpen } from 'lucide-react';

const STATUS_CONFIG = {
  in_transit: { pill: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-500',    label: 'In Transit' },
  delivered:  { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Delivered' },
  confirmed:  { pill: 'bg-orange-50 text-[#ff6b35]',  dot: 'bg-[#ff6b35]',  label: 'Confirmed' },
  cancelled:  { pill: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400',   label: 'Cancelled' },
  processing: { pill: 'bg-amber-50 text-amber-700',    dot: 'bg-amber-500',   label: 'Processing' },
};

const FALLBACK = { pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Unknown' };

function OrderRow({ order }) {
  const cfg       = STATUS_CONFIG[order.status] ?? FALLBACK;
  const dropCity  = typeof order.dropoff === 'string'
    ? order.dropoff.split(',')[0].trim()
    : order.dropoff?.address?.split(',')[0].trim() ?? 'Unknown';
  const pickupCity = typeof order.pickup === 'string'
    ? order.pickup.split(',')[0].trim()
    : order.pickup?.address?.split(',')[0].trim() ?? 'Unknown';

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 rounded-xl px-3 -mx-3 transition-colors"
    >
      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-xl">
        {order.emoji ?? <Package size={18} className="text-[#ff6b35]" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {pickupCity} → {dropCity}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          #{order.id} &bull; {order.type} &bull; {order.date}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-bold text-slate-800">{order.fare}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <PackageOpen size={26} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">No orders yet</p>
      <p className="text-xs text-slate-400 max-w-50">
        Your delivery history will appear here once you place an order.
      </p>
    </div>
  );
}

export default function RecentOrders({ orders = [] }) {
  const recent = orders.slice(0, 5);

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
        {orders.length > 0 && (
          <Link href="/dashboard/orders" className="text-xs font-bold text-[#ff6b35] hover:underline">
            See All
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-1">
        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          recent.map((order) => <OrderRow key={order.id} order={order} />)
        )}
      </div>
    </section>
  );
}
