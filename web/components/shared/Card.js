export default function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] ${padding ? 'p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
