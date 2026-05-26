import { Inbox } from 'lucide-react';

/**
 * @param {object} [props]
 * @param {React.ComponentType<{ size?: number, className?: string }>} [props.icon]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.action]
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
} = {}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 md:p-14 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-[#0F1923] font-bold text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6 inline-flex">{action}</div>}
    </div>
  );
}
