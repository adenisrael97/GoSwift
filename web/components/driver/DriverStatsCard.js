import { Banknote, Package, Clock, TrendingUp } from 'lucide-react';

const iconMap = {
  banknote: Banknote,
  package: Package,
  clock: Clock,
};

/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} props.value
 * @param {string} [props.icon]
 * @param {string} [props.trend]
 */
export default function DriverStatsCard({ label, value, icon, trend }) {
  const Icon = iconMap[icon] ?? Banknote;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <Icon size={20} className="text-[#ab3500]" />
        </div>
        {trend === 'up' && <TrendingUp size={16} className="text-emerald-500" />}
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <span className="text-[#0F1923] font-black text-2xl">{value}</span>
    </div>
  );
}
