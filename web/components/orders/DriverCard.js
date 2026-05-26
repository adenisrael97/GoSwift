import { Phone, MessageSquare } from 'lucide-react';

// Strip everything except digits and a leading +, so the number is safe
// to drop into a tel:/sms: URI regardless of how it was stored.
function cleanPhone(phone) {
  return (phone ?? '').replace(/[^\d+]/g, '');
}

export default function DriverCard({ driver }) {
  if (!driver) return null;

  const tel = cleanPhone(driver.phone);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-2xl border-2 border-orange-50 shrink-0">
            🧑
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{driver.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-sm text-slate-500">
              {driver.rating} &bull; {driver.trips.toLocaleString()} trips
            </span>
          </div>
          {driver.vehicle && (
            <p className="text-xs text-slate-400 mt-0.5">{driver.vehicle}</p>
          )}
        </div>
      </div>

      {tel ? (
        <div className="flex gap-2">
          <a
            href={`sms:${tel}`}
            aria-label={`Message ${driver.name}`}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <MessageSquare size={18} />
          </a>
          <a
            href={`tel:${tel}`}
            aria-label={`Call ${driver.name}`}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#ab3500] text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Phone size={18} />
          </a>
        </div>
      ) : (
        <span className="text-xs text-slate-400 italic">No phone on file</span>
      )}
    </div>
  );
}
