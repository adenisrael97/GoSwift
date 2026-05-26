const STATUS_CONFIG = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-500",
    label: "Pending",
    pulse: true,
  },
  approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
    label: "Approved",
    pulse: false,
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-500",
    label: "Rejected",
    pulse: false,
  },
};

export default function StatusBadge({ status, size = "sm" }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${c.bg} ${c.text} ${
        size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span
        className={`rounded-full ${c.dot} ${c.pulse ? "animate-pulse" : ""} ${
          size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5"
        }`}
      />
      {c.label}
    </span>
  );
}
