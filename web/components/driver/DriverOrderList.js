import Link from 'next/link';
import { Bike } from 'lucide-react';

export default function DriverOrderList({ deliveries }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
      {deliveries.map((delivery) => (
        <Link
          key={delivery.id}
          href={`/driver/orders/${delivery.id}`}
          className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group active:scale-[0.99]"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Bike size={20} className="text-[#ab3500]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[#0F1923] font-bold text-sm leading-none truncate">
              Order #{(delivery.id ?? '').slice(0, 8)}
            </p>
            <p className="text-slate-400 text-xs mt-1 truncate">{delivery.route}</p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[#ab3500] font-black text-sm">{delivery.amount}</p>
            <p className="text-slate-400 text-[10px] mt-0.5">{delivery.time}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
