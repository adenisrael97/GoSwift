import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function SettingItem({ icon: Icon, label, href, onClick, variant, iconBg = 'bg-slate-50', iconColor = 'text-slate-500' }) {
  const isDanger = variant === 'danger';

  const inner = (
    <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group w-full">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${isDanger ? 'bg-red-50' : iconBg} ${isDanger ? 'text-red-500' : iconColor} flex items-center justify-center shrink-0`}>
          <Icon size={22} />
        </div>
        <span className={`font-medium text-base ${isDanger ? 'text-red-500' : 'text-slate-700'}`}>{label}</span>
      </div>
      <ChevronRight
        size={18}
        className={`transition-transform group-hover:translate-x-1 ${isDanger ? 'text-red-300' : 'text-slate-300'}`}
      />
    </div>
  );

  if (href) {
    return <Link href={href} className="block w-full">{inner}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {inner}
    </button>
  );
}
