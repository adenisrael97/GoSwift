/**
 * Reusable sticky page header.
 *
 * Props:
 *   backHref   — if provided, renders an ArrowLeft link to that path
 *   title      — primary brand/page title (defaults to "GoSwift")
 *   subtitle   — optional small label rendered below the title
 *   rightSlot  — JSX rendered on the right side; defaults to Bell + HelpCircle buttons
 */

import Link from 'next/link';
import { ArrowLeft, Bell, HelpCircle } from 'lucide-react';

function DefaultRight() {
  return (
    <div className="flex gap-1">
      <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors" aria-label="Notifications">
        <Bell size={20} />
      </button>
      <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors" aria-label="Help">
        <HelpCircle size={20} />
      </button>
    </div>
  );
}

/**
 * @param {object} [props]
 * @param {string} [props.backHref]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.rightSlot]
 */
export default function AppHeader({
  backHref,
  title = 'GoSwift',
  subtitle,
  rightSlot = <DefaultRight />,
} = {}) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-3">

        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-slate-900" />
            </Link>
          )}
          <div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tighter leading-none">
              {title}
            </span>
            {subtitle && (
              <p className="text-[10px] font-bold text-[#ff6b35] uppercase tracking-widest leading-none mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightSlot}
      </div>
    </header>
  );
}
