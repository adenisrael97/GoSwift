"use client";

// IDs must match the VehicleType enum in lib/api/schemas/drivers.js
const VEHICLE_TYPES = [
  { id: "bike",     emoji: "🏍️", label: "Motorcycle" },
  { id: "tricycle", emoji: "🛺",  label: "Tricycle (Keke)" },
  { id: "car",      emoji: "🚗",  label: "Car / Van" },
  { id: "pickup",   emoji: "🚚",  label: "Pickup" },
  { id: "truck",    emoji: "🚛",  label: "Truck" },
];

const inputClass =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:ring-2 focus:ring-[#ab3500] focus:border-[#ab3500] outline-none transition-all";

const inputErrorClass =
  "w-full bg-white border border-red-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all";

const labelClass =
  "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-500">{msg}</p>;
}

/**
 * @param {object} props
 * @param {Record<string, any>} props.formData
 * @param {(field: string, value: any) => void} props.onChange
 * @param {Record<string, any>} [props.errors]
 */
export default function VehicleInfoStep({ formData, onChange, errors = {} }) {
  return (
    <section className="space-y-8">
      {/* Vehicle type selector */}
      <div>
        <p className="text-base font-bold text-[#0F1923] mb-1">Vehicle Type</p>
        {errors.vehicleType && (
          <p className="mb-3 text-xs font-medium text-red-500">{errors.vehicleType}</p>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {VEHICLE_TYPES.map(({ id, emoji, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange("vehicleType", id)}
              className={`p-5 rounded-2xl flex flex-col items-center gap-2.5 border-2 transition-all ${
                formData.vehicleType === id
                  ? "bg-[#0F1923] text-white border-[#ab3500] shadow-lg"
                  : errors.vehicleType
                  ? "bg-white text-[#0F1923] border-red-300 shadow-sm hover:border-[#ab3500]/30"
                  : "bg-white text-[#0F1923] border-transparent shadow-sm hover:border-[#ab3500]/30"
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Model / Make</label>
          <input
            type="text"
            value={formData.vehicleModel}
            onChange={(e) => onChange("vehicleModel", e.target.value)}
            placeholder="e.g. Boxer BM 150"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Plate Number</label>
          <input
            type="text"
            value={formData.plateNumber}
            onChange={(e) => onChange("plateNumber", e.target.value)}
            placeholder="e.g. LAG-4458-KS"
            className={errors.plateNumber ? inputErrorClass : inputClass}
          />
          <FieldError msg={errors.plateNumber} />
        </div>
        <div>
          <label className={labelClass}>Manufacturer</label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => onChange("manufacturer", e.target.value)}
            placeholder="e.g. Bajaj, TVS, Honda"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Color</label>
          <input
            type="text"
            value={formData.vehicleColor}
            onChange={(e) => onChange("vehicleColor", e.target.value)}
            placeholder="e.g. Signal Orange"
            className={inputClass}
          />
        </div>
      </div>

      {/* Guarantor */}
      <div>
        <p className="text-base font-bold text-[#0F1923] mb-4">
          Guarantor Information
        </p>
        <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed">
              A verified guarantor ensures safety standards. They must be a
              responsible adult who knows you personally.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Guarantor Full Name
                </label>
                <input
                  type="text"
                  value={formData.guarantorName}
                  onChange={(e) => onChange("guarantorName", e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-[#ab3500] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Guarantor Phone
                </label>
                <input
                  type="tel"
                  value={formData.guarantorPhone}
                  onChange={(e) => onChange("guarantorPhone", e.target.value)}
                  placeholder="+234 800 000 0000"
                  className={
                    errors.guarantorPhone
                      ? "w-full bg-white/10 border border-red-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-red-400 outline-none transition-all"
                      : "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-[#ab3500] outline-none transition-all"
                  }
                />
                <FieldError msg={errors.guarantorPhone} />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-[#ab3500] opacity-20 blur-3xl rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
