"use client";

import { useState } from "react";
import { buildE164 } from "@/lib/utils/validation";

const COUNTRY_CODES = [
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+1",   flag: "🇺🇸", name: "USA" },
  { code: "+44",  flag: "🇬🇧", name: "UK" },
  { code: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
];

function formatDisplay(raw) {
  if (raw.length <= 3) return raw;
  if (raw.length <= 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
}

/**
 * Country-code + local-number input. Emits the assembled E.164 string via
 * onChange on every keystroke, so the parent always holds a normalised value
 * ready to submit. Shared by the register and login (phone mode) forms.
 *
 * @param {object} props
 * @param {(e164: string) => void} props.onChange  receives the E.164 value
 * @param {boolean} [props.hasError]               red border when true
 * @param {boolean} [props.autoFocus]
 */
export default function PhoneField({ onChange, hasError = false, autoFocus = false }) {
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [digits, setDigits] = useState("");
  const [open, setOpen] = useState(false);

  const emit = (nextCountry, nextDigits) => {
    onChange(nextDigits ? buildE164(nextCountry.code, nextDigits) : "");
  };

  const handleDigits = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    setDigits(raw);
    emit(country, raw);
  };

  const handleCountry = (c) => {
    setCountry(c);
    setOpen(false);
    emit(c, digits);
  };

  return (
    <div className="relative">
      <div
        className={[
          "flex items-stretch border-2 rounded-xl bg-white transition-all duration-200",
          hasError
            ? "border-red-400 ring-4 ring-red-500/10"
            : "border-slate-100 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/8",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-4 bg-slate-900 rounded-l-[10px] flex items-center gap-2 hover:bg-slate-800 transition-colors select-none"
          aria-label="Select country code"
          aria-expanded={open}
        >
          <span className="text-base">{country.flag}</span>
          <span className="text-white font-bold text-sm">{country.code}</span>
          <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 12 12">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-[0_8px_24px_rgba(15,25,35,0.12)] border border-slate-100 py-1.5 z-50">
            {COUNTRY_CODES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCountry(c)}
                className={[
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left",
                  country.code === c.code ? "bg-orange-50 text-orange-600 font-semibold" : "text-slate-700",
                ].join(" ")}
              >
                <span className="text-base">{c.flag}</span>
                <span className="font-semibold">{c.code}</span>
                <span className="text-slate-400 text-xs ml-auto">{c.name}</span>
              </button>
            ))}
          </div>
        )}

        <input
          type="tel"
          inputMode="numeric"
          value={formatDisplay(digits)}
          onChange={handleDigits}
          placeholder="801 234 5678"
          maxLength={13}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent border-none focus:ring-0 outline-none py-4 px-4 text-base font-semibold text-slate-900 placeholder:text-slate-300"
        />
      </div>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
