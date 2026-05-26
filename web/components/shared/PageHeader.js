import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.subtitle]
 * @param {string} [props.backHref]
 * @param {React.ReactNode} [props.actions]
 */
export default function PageHeader({ title, subtitle, backHref, actions }) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-[#ab3500] mb-3 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
        )}
        <h1 className="text-2xl md:text-3xl font-black text-[#0F1923] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-500 text-sm md:text-base mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
