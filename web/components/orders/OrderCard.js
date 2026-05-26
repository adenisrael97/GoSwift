import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function OrderCard({ order }) {

  return (
    <Link href={`/dashboard/orders/${order.id}`} className="block h-full">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:scale-[0.99] transition-all cursor-pointer h-full flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-50 flex items-center justify-center rounded-xl text-2xl shrink-0">
              {order.emoji}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase font-mono">
                #{order.id}
              </p>
              <p className="text-base font-bold text-slate-900">{order.type}</p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Route */}
        <div className="relative py-2 mb-4 grow">
          <div className="absolute left-2 top-4 bottom-4 w-0 border-l-2 border-dashed border-slate-200" />
          <div className="flex items-start gap-4 mb-4">
            <div className="z-10 w-4 h-4 rounded-full border-4 border-orange-500 bg-white mt-1 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                PICKUP
              </p>
              <p className="text-sm font-medium text-slate-900">{order.pickup.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="z-10 w-4 h-4 rounded-full border-4 border-slate-300 bg-white mt-1 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                DROPOFF
              </p>
              <p className="text-sm font-medium text-slate-900">{order.dropoff.address}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              TOTAL FARE
            </span>
            <span className="text-lg font-extrabold text-[#ab3500]">{order.fare}</span>
          </div>
          <div className="flex items-center gap-2">
            {order.vehicleEmoji && (
              <span
                title={order.vehicleLabel}
                className="text-lg leading-none"
              >
                {order.vehicleEmoji}
              </span>
            )}
            <span className="border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider">
              DETAILS
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
