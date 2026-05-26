"use client";

import { ShieldCheck } from "lucide-react";

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

export default function PersonalInfoStep({ formData, onChange, errors = {}, lockedPhone = false }) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Full name */}
        <div className="lg:col-span-2">
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder="John Doe"
            className={errors.fullName ? inputErrorClass : inputClass}
          />
          <FieldError msg={errors.fullName} />
        </div>

        {/* Phone — locked when pre-filled from the signed-in account */}
        {lockedPhone ? (
          <div className="lg:col-span-2">
            <label className={labelClass}>Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                value={formData.phone}
                readOnly
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-500 outline-none cursor-not-allowed pr-28"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <ShieldCheck size={11} />
                On file
              </span>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="w-20 shrink-0">
              <label className={labelClass}>Code</label>
              <div className="bg-[#0F1923] text-white rounded-xl px-3 h-13 flex items-center justify-center font-bold text-sm">
                +234
              </div>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="801 234 5678"
                className={errors.phone ? inputErrorClass : inputClass}
              />
              <FieldError msg={errors.phone} />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className={labelClass}>Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="john@example.com"
            className={errors.email ? inputErrorClass : inputClass}
          />
          <FieldError msg={errors.email} />
        </div>

        {/* Date of birth */}
        <div>
          <label className={labelClass}>Date of Birth</label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Gender */}
        <div>
          <label className={labelClass}>Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className={inputClass}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        </div>

        {/* NIN */}
        <div>
          <label className={labelClass}>NIN Number</label>
          <input
            type="text"
            value={formData.nin}
            onChange={(e) => onChange("nin", e.target.value)}
            placeholder="1234 5678 901"
            maxLength={14}
            className={errors.nin ? inputErrorClass : inputClass}
          />
          <FieldError msg={errors.nin} />
        </div>

        {/* Address */}
        <div className="lg:col-span-2">
          <label className={labelClass}>Home Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Street, City, State"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
    </section>
  );
}
