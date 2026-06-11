'use client';

import { useId, useRef, useState } from 'react';

import { suggestAddress, resolvePlace } from '@/lib/api';

/**
 * A single address field with Google Places autocomplete.
 *
 * - Free typing always works (and is reported via onChange). When geocoding
 *   is not configured server-side, the suggestions list simply stays empty,
 *   so this behaves like a plain text input.
 * - Selecting a suggestion reports the chosen address + its coordinates via
 *   onSelect({ description, lat, lng }).
 *
 * A session token groups all keystrokes + the final details lookup into one
 * billable Google session; it's reset after each selection.
 *
 * @param {object}   props
 * @param {string}   props.label
 * @param {string}   props.value
 * @param {string}   props.placeholder
 * @param {string}   [props.error]
 * @param {(text: string) => void} props.onChange
 * @param {(picked: { description: string, lat: number|null, lng: number|null }) => void} props.onSelect
 */
export default function AddressAutocomplete({
  label, value, placeholder, error, onChange, onSelect,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const sessionRef  = useRef(null);
  const debounceRef = useRef(null);
  const blurRef     = useRef(null);
  const listId      = useId();

  // Session token groups a typing session + its details lookup into one
  // billable Google session. It's optional — if crypto.randomUUID isn't
  // available we simply omit it (each call is then billed independently).
  function newSession() {
    if (!sessionRef.current) {
      sessionRef.current = globalThis.crypto?.randomUUID?.() ?? null;
    }
    return sessionRef.current ?? undefined;
  }

  function handleType(v) {
    onChange(v);
    clearTimeout(debounceRef.current);

    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const token = newSession();
    debounceRef.current = setTimeout(async () => {
      const { ok, body } = await suggestAddress(v, token);
      const list = ok ? (body.suggestions ?? []) : [];
      setSuggestions(list);
      setOpen(list.length > 0);
    }, 250);
  }

  async function pick(s) {
    setOpen(false);
    setSuggestions([]);
    const token = sessionRef.current;
    sessionRef.current = null; // end the billing session after the details call

    const { ok, body } = await resolvePlace(s.placeId, token);
    if (ok) {
      onSelect({ description: s.description, lat: body.lat, lng: body.lng });
    } else {
      // Resolution failed — keep the text, leave coords unset.
      onSelect({ description: s.description, lat: null, lng: null });
    }
  }

  return (
    <div className="relative">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => {
          // Delay so an onMouseDown on a suggestion still registers.
          blurRef.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-autocomplete="list"
        className={`w-full text-sm font-medium text-slate-900 bg-transparent border-b pb-1.5 outline-none placeholder:text-slate-300 transition-colors ${
          error
            ? 'border-red-400 focus:border-red-400'
            : 'border-slate-200 focus:border-[#ff6b35]'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden max-h-60 overflow-y-auto"
        >
          {suggestions.map((s) => (
            <li key={s.placeId} role="option" aria-selected="false">
              <button
                type="button"
                // onMouseDown (not onClick) fires before the input's onBlur,
                // so the selection isn't lost to the blur-close.
                onMouseDown={(e) => {
                  e.preventDefault();
                  clearTimeout(blurRef.current);
                  pick(s);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 transition-colors"
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
