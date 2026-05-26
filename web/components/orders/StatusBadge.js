const STATUS_CONFIG = {
  in_transit: {
    label: 'In-Transit',
    classes: 'bg-orange-50 text-orange-600',
    dot: 'bg-orange-500 animate-pulse',
  },
  processing: {
    label: 'Processing',
    classes: 'bg-blue-50 text-blue-600',
    dot: 'bg-blue-500',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-orange-50 text-[#ff6b35]',
    dot: 'bg-[#ff6b35] animate-pulse',
  },
  delivered: {
    label: 'Delivered',
    classes: 'bg-emerald-50 text-emerald-600',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-slate-100 text-slate-500',
    dot: 'bg-slate-400',
  },
};

const FALLBACK = {
  label: 'Pending',
  classes: 'bg-amber-50 text-amber-600',
  dot: 'bg-amber-500',
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
