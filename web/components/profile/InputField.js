/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {string} [props.type]
 * @param {any} [props.value]
 * @param {React.ChangeEventHandler<HTMLInputElement>} [props.onChange]
 * @param {React.ComponentType<{ size?: number, className?: string }>} [props.icon]
 * @param {boolean} [props.readOnly]
 * @param {React.ReactNode} [props.hint]
 */
export default function InputField({ label, type = 'text', value, onChange, icon: Icon, readOnly = false, hint }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">{label}</label>
      {readOnly ? (
        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
          {value}
          {Icon && <Icon size={16} className="ml-auto text-slate-400 shrink-0" />}
        </div>
      ) : (
        <div className="relative">
          <input
            type={type}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#F7F8FA] border border-transparent focus:border-[#ab3500] focus:ring-2 focus:ring-[#ab3500]/10 outline-none transition-all text-base font-medium text-slate-900"
          />
          {Icon && (
            <Icon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          )}
        </div>
      )}
      {hint && <p className="text-xs text-slate-400 italic mt-1.5">{hint}</p>}
    </div>
  );
}
