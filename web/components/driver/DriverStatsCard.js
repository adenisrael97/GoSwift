import { Banknote, Package, Clock, TrendingUp } from 'lucide-react';

const iconMap = {
  banknote: { Icon: Banknote, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  package:  { Icon: Package,  bg: 'bg-blue-50',    color: 'text-blue-600' },
  clock:    { Icon: Clock,    bg: 'bg-violet-50',  color: 'text-violet-600' },
};

/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} props.value
 * @param {string} [props.icon]
 * @param {string} [props.trend]
 */
export default function DriverStatsCard({ label, value, icon, trend }) {
  const { Icon, bg, color } = iconMap[icon] ?? iconMap.banknote;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        {trend === 'up' && <TrendingUp size={16} className="text-emerald-500" />}
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <span className="text-[#0F1923] font-black text-2xl">{value}</span>
    </div>
  );
}
