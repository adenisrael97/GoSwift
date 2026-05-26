'use client';

import { useState, useMemo } from 'react';
import EmptyState from './EmptyState';

/**
 * Generic table with optional tab filtering.
 *
 * Props:
 * - columns: [{ key, label, align?, render?(row) }]
 * - rows: array of row objects (must have stable `id`)
 * - tabs?: ['All', 'Active', ...] — filter chips
 * - filterKey?: string  — row field tabs match against (lowercase)
 * - title?: string
 * - actions?: ReactNode — right-side action row
 * - emptyTitle / emptyDescription
 */
/**
 * @param {object} props
 * @param {Array<{ key: string, label: string, render?: Function, align?: string }>} props.columns
 * @param {Array<any>} props.rows
 * @param {Array<string>} [props.tabs]
 * @param {string} [props.filterKey]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.actions]
 * @param {string} [props.emptyTitle]
 * @param {React.ReactNode} [props.emptyDescription]
 */
export default function DataTable({
  columns,
  rows,
  tabs,
  filterKey = 'status',
  title,
  actions,
  emptyTitle = 'No results',
  emptyDescription,
}) {
  const [activeTab, setActiveTab] = useState(tabs ? tabs[0] : null);

  const filtered = useMemo(() => {
    if (!tabs || activeTab === tabs[0]) return rows;
    return rows.filter((r) => String(r[filterKey]).toLowerCase() === activeTab.toLowerCase());
  }, [rows, tabs, activeTab, filterKey]);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      {(title || tabs || actions) && (
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {title && <h2 className="text-lg font-bold text-[#0F1923]">{title}</h2>}

          <div className="flex items-center gap-3 flex-wrap">
            {tabs && (
              <div className="flex bg-slate-50 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                      activeTab === tab
                        ? 'bg-white text-[#ab3500] shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-2">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-180">
            <thead>
              <tr className="bg-slate-50/60 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 md:px-6 py-4 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 md:px-6 py-4 text-sm text-slate-700 ${
                        col.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
