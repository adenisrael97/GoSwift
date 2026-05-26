import { ShieldAlert, XCircle, Info } from 'lucide-react';

const CONSEQUENCES = [
  'Immediate loss of access to your active delivery history.',
  'Any remaining balance in your GoSwift Wallet will be forfeited.',
  'Active subscription plans and rewards will be cancelled immediately.',
];

export default function DangerZone() {
  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-[0_20px_40px_-12px_rgba(239,68,68,0.08)] overflow-hidden">
      <div className="p-6">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
          <ShieldAlert size={24} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
          Delete your account?
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          This action is final and cannot be undone. Once your account is deleted, all associated
          data will be purged from the GoSwift network.
        </p>
        <div className="space-y-4">
          {CONSEQUENCES.map((text, i) => (
            <div key={i} className="flex gap-3 items-start">
              <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm text-slate-600">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-red-50/60 px-6 py-3 border-t border-red-100 flex items-center gap-2">
        <Info size={12} className="text-red-500 shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">
          Permanent Deletion Warning
        </p>
      </div>
    </div>
  );
}
