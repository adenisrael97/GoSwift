'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Compact pager used at the bottom of data tables.
 * - Hides itself when there is only one page of results.
 * - Disables prev/next at the boundaries.
 * - Uses 1-based page numbers (server contract).
 *
 * Two modes:
 *   • Link mode — pass `hrefTemplate` as a string with the literal `{n}`
 *     placeholder (e.g. `/admin/drivers?page={n}`). Pagination becomes
 *     plain Next/Link navigation. Strings cross the RSC→Client boundary,
 *     functions don't — so this works for Server Component callers.
 *   • Callback mode — pass `onPage(n)`. Client-only.
 *
 * Pass either one, not both. If both are passed, link mode wins.
 *
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.pages
 * @param {number} [props.total]
 * @param {string} [props.hrefTemplate]
 * @param {(n: number) => void} [props.onPage]
 * @param {boolean} [props.loading]
 */
export default function Paginator({ page, pages, total, hrefTemplate, onPage, loading = false }) {
  if (!pages || pages <= 1) return null;

  const canPrev = page > 1 && !loading;
  const canNext = page < pages && !loading;

  const buildHref = hrefTemplate
    ? (/** @type {number} */ n) => hrefTemplate.replace('{n}', String(n))
    : null;

  const Prev = canPrev && buildHref
    ? <Link href={buildHref(page - 1)} aria-label="Previous page"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
        <ChevronLeft size={16} />
      </Link>
    : <button type="button" onClick={() => canPrev && onPage?.(page - 1)} disabled={!canPrev} aria-label="Previous page"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        <ChevronLeft size={16} />
      </button>;

  const Next = canNext && buildHref
    ? <Link href={buildHref(page + 1)} aria-label="Next page"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
        <ChevronRight size={16} />
      </Link>
    : <button type="button" onClick={() => canNext && onPage?.(page + 1)} disabled={!canNext} aria-label="Next page"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        <ChevronRight size={16} />
      </button>;

  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 flex-wrap gap-3">
      <p className="text-sm text-slate-500">
        Page <span className="font-semibold text-[#0F1923]">{page}</span> of{' '}
        <span className="font-semibold text-[#0F1923]">{pages}</span>
        {total != null && (
          <> · <span className="font-semibold text-[#0F1923]">{total.toLocaleString()}</span> total</>
        )}
      </p>

      <div className="flex items-center gap-2">
        {Prev}
        <span className="px-3.5 py-1.5 rounded-lg bg-[#ab3500] text-white font-bold text-sm">{page}</span>
        {Next}
      </div>
    </div>
  );
}
