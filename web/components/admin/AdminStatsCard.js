import { ShoppingCart, Radar, Users, Banknote, TrendingUp } from 'lucide-react';

const iconMap = {
  'shopping-cart': { Icon: ShoppingCart, bg: 'bg-orange-50',  color: 'text-orange-600' },
  'radar':         { Icon: Radar,        bg: 'bg-slate-50',   color: 'text-slate-600' },
  'users':         { Icon: Users,        bg: 'bg-slate-50',   color: 'text-slate-600' },
  'banknote':      { Icon: Banknote,     bg: 'bg-emerald-50', color: 'text-emerald-600' },
};

function BadgeChip({ badge }) {
  if (!badge) return null;

  if (badge.variant === 'success') {
    return (
      <span className="flex items-center gap-0.5 text-emerald-500 font-bold text-xs">
        <TrendingUp size={14} />
        {badge.label}
      </span>
    );
  }
  if (badge.variant === 'live') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black tracking-widest rounded-full uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
        {badge.label}
      </span>
    );
  }
  return (
    <span className="text-[10px] text-slate-400 font-medium">{badge.label}</span>
  );
}

export default function AdminStatsCard({ label, value, icon, badge }) {
  const { Icon, bg, color } = iconMap[icon] ?? iconMap['banknote'];

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 ${bg} ${color} rounded-xl`}>
          <Icon size={20} />
        </div>
        <BadgeChip badge={badge} />
      </div>
      <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">{label}</p>
      <h3 className="text-xl md:text-3xl font-black text-[#0F1923]">{value}</h3>
    </div>
  );
}
