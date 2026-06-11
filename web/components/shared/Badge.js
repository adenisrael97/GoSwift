const variants = {
  active:     'bg-orange-100 text-orange-700',
  pending:    'bg-amber-100  text-amber-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  completed:  'bg-emerald-100 text-emerald-700',
  confirmed:  'bg-orange-50  text-orange-600',
  cancelled:  'bg-red-100    text-red-700',
  rejected:   'bg-red-100    text-red-700',
  approved:   'bg-emerald-100 text-emerald-700',
  in_transit: 'bg-blue-100  text-blue-700',
  transit:    'bg-blue-100  text-blue-700',
  processing: 'bg-sky-100   text-sky-700',
  assigned:   'bg-indigo-100 text-indigo-700',
  live:       'bg-orange-100 text-orange-600',
  success:    'bg-emerald-50 text-emerald-600',
  paid:       'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100    text-red-700',
  neutral:    'bg-slate-100  text-slate-500',
  online:     'bg-emerald-100 text-emerald-700',
  offline:    'bg-slate-100  text-slate-500',
  busy:       'bg-amber-100  text-amber-700',
  available:  'bg-emerald-100 text-emerald-700',
};

const pulseDot = new Set(['active', 'live', 'in_transit', 'transit', 'processing', 'online', 'busy']);

export default function Badge({ label, variant = 'neutral', dot = false, className = '' }) {
  const base = variants[variant] ?? variants.neutral;
  const shouldPulse = pulseDot.has(variant);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${base} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${shouldPulse ? 'animate-pulse' : ''}`} />}
      {label}
    </span>
  );
}
