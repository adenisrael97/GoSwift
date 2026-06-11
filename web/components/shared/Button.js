const variants = {
  primary:   'bg-[#ab3500] text-white hover:bg-[#8f2d00] shadow-lg shadow-orange-900/20 focus-visible:ring-2 focus-visible:ring-[#ab3500] focus-visible:ring-offset-2',
  secondary: 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
  ghost:     'text-[#ab3500] hover:bg-orange-50 hover:text-[#8f2d00] focus-visible:ring-2 focus-visible:ring-[#ab3500] focus-visible:ring-offset-2',
  danger:    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
};

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.fullWidth]
 * @param {string} [props.className]
 * @param {React.MouseEventHandler<HTMLButtonElement>} [props.onClick]
 * @param {'button'|'submit'|'reset'} [props.type]
 * @param {boolean} [props.disabled]
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-bold rounded-xl
        active:scale-95 transition-all duration-200
        focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
