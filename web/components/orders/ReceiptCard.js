export default function ReceiptCard({ payment }) {
  const statusColor =
    payment.status === 'Success' || payment.status === 'Paid'
      ? 'bg-emerald-500/20 text-emerald-400'
      : payment.status === 'Refunded'
      ? 'bg-blue-500/20 text-blue-400'
      : 'bg-amber-500/20 text-amber-400';

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#ab3500]/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
        Payment Summary
      </h3>

      <div className="space-y-3 mb-5">
        <div className="flex justify-between text-slate-300 text-sm">
          <span>Delivery Base Fare</span>
          <span>{payment.base}</span>
        </div>
        <div className="flex justify-between text-slate-300 text-sm">
          <span>Distance Charge</span>
          <span>{payment.distance}</span>
        </div>
        <div className="flex justify-between text-slate-300 text-sm">
          <span>Service Fee</span>
          <span>{payment.fee}</span>
        </div>
        <div className="h-px bg-slate-800 my-1" />
        <div className="flex justify-between items-center">
          <span className="text-white font-medium text-base">Total Paid</span>
          <span className="text-2xl font-extrabold text-[#ff6b35]">{payment.total}</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💳</span>
          <span className="text-slate-100 text-sm">{payment.method}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${statusColor}`}>
          {payment.status}
        </span>
      </div>
    </div>
  );
}
