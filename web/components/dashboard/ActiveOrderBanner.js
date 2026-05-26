import { Truck, ChevronRight } from 'lucide-react';

/** Renders a banner for the user's most recent active order. Returns null when there is none. */
export default function ActiveOrderBanner({ order }) {
  if (!order) return null;

  return (
    <div className="bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-[#ff6b35]/15 active:scale-[0.98] transition-all">
      <div className="w-12 h-12 bg-[#ff6b35] rounded-xl flex items-center justify-center shadow-lg shadow-[#ff6b35]/30 shrink-0">
        <Truck size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[#5f1900] text-base leading-tight">{order.status}</h4>
        <p className="text-sm text-[#ff6b35]/80 mt-0.5 truncate">
          ETA: {order.eta} &bull; {order.location}
        </p>
      </div>
      <ChevronRight size={20} className="text-[#ff6b35] shrink-0" />
    </div>
  );
}
