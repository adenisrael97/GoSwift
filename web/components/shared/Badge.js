const variants = {
  active:    'bg-orange-100 text-orange-700',
  pending:   'bg-amber-100  text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100    text-red-700',
  rejected:  'bg-red-100    text-red-700',
  approved:  'bg-emerald-100 text-emerald-700',
  live:      'bg-orange-100 text-orange-600',
  success:   'bg-emerald-50 text-emerald-600',
  neutral:   'bg-slate-100  text-slate-500',
  online:    'bg-emerald-100 text-emerald-700',
  offline:   'bg-slate-100  text-slate-500',
};

export default function Badge({ label, variant = 'neutral', dot = false, className = '' }) {
  const base = variants[variant] ?? variants.neutral;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${base} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}
