'use client';

// Vertical 4-step delivery progress tracker for the customer order detail page.
// `status` drives which steps are completed — no timestamp required, but
// timestamps are shown when available.

const STEPS = [
  {
    key:   'confirmed',
    label: 'Order Confirmed',
    sub:   'Your order has been placed and is being dispatched',
    tsKey: 'created',
  },
  {
    key:   'processing',
    label: 'Driver Assigned',
    sub:   'Your driver is on the way to the pickup point',
    tsKey: null,
  },
  {
    key:   'in_transit',
    label: 'Package Picked Up',
    sub:   'Your package is in transit to the dropoff location',
    tsKey: 'pickedUp',
  },
  {
    key:   'delivered',
    label: 'Delivered',
    sub:   'Your package has arrived at its destination',
    tsKey: 'delivered',
  },
];

// Maps status → the index of the last completed step (0-based).
// pending = -1 so no step shows as done yet (order not yet confirmed).
const RANK = { pending: -1, confirmed: 0, processing: 1, in_transit: 2, delivered: 3 };

function fmtTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function DeliveryTracker({ status, timestamps = {} }) {
  if (status === 'cancelled') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Delivery Progress
        </h3>
        <p className="text-sm font-semibold text-red-500">This order was cancelled.</p>
      </div>
    );
  }

  const rank = RANK[status] ?? 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
        Delivery Progress
      </h3>

      <div className="relative">
        {/* Vertical connector line between dots */}
        <div className="absolute left-2.75 top-6 bottom-6 w-0 border-l-2 border-slate-100" />

        <ol className="space-y-6">
          {STEPS.map((step, i) => {
            const done    = rank >= i;
            const current = rank === i && status !== 'delivered';
            const ts      = step.tsKey ? timestamps[step.tsKey] : null;

            return (
              <li key={step.key} className="flex items-start gap-4 relative">
                {/* Step dot */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 mt-0.5 transition-colors ${
                    done
                      ? 'bg-[#ab3500] border-[#ab3500]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {done ? (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                  )}
                </div>

                {/* Step text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-bold ${done ? 'text-[#0F1923]' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    {current && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ab3500] bg-orange-50 px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ab3500] animate-pulse inline-block" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${done ? 'text-slate-500' : 'text-slate-300'}`}>
                    {step.sub}
                  </p>
                  {ts && fmtTime(ts) && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtTime(ts)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
