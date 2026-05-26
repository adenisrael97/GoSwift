import { PackageOpen } from 'lucide-react';
import OrderCard from './OrderCard';

export default function OrderList({ orders }) {
  if (!orders.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <PackageOpen size={28} className="text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-700 mb-1">No orders here</p>
        <p className="text-xs text-slate-400">Orders will appear here once placed.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
