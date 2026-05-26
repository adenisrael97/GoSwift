'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import DataTable from '@/components/shared/DataTable';
import Paginator from '@/components/shared/Paginator';
import Badge     from '@/components/shared/Badge';

/**
 * Client island for the driver-orders table. Receives a fully-mapped
 * page of orders from the Server Component and owns:
 *   • the search input (filters the current page in memory)
 *   • the tab toggle (All / Delivered / Cancelled)
 *   • the row render callbacks (which can't cross the RSC boundary as props)
 *
 * Pagination is server-side — the Paginator emits href links that the
 * Next.js router intercepts. No client-side state mutation needed.
 */

const TABS = ['All', 'Delivered', 'Cancelled'];
const TAB_STATUS = {
  All:       null,
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

function shortCity(addr) {
  if (!addr || typeof addr !== 'string') return '—';
  return addr.split(',')[0].trim() || '—';
}

const COLUMNS = [
  {
    key: 'id',
    label: 'Order #',
    render: (o) => <span className="font-bold text-[#0F1923]">#{(o.id ?? '').slice(0, 8)}</span>,
  },
  {
    key: 'customer',
    label: 'Customer',
    render: (o) => <span className="font-semibold text-[#0F1923]">{o.customer || '—'}</span>,
  },
  {
    key: 'route',
    label: 'Route',
    render: (o) => (
      <span className="text-xs text-slate-500">
        {shortCity(o.pickup)} → {shortCity(o.dropoff)}
      </span>
    ),
  },
  { key: 'distance', label: 'Distance', render: (o) => <span className="text-slate-700">{o.distance || '—'}</span> },
  { key: 'fare',     label: 'Fare',     render: (o) => <span className="font-semibold text-[#0F1923]">{o.fare || '—'}</span> },
  { key: 'status',   label: 'Status',   render: (o) => <Badge label={o.status} variant={o.status} /> },
  { key: 'date',     label: 'When',     render: (o) => <span className="text-xs text-slate-500">{o.date}</span> },
  {
    key: 'view',
    label: 'Action',
    align: 'right',
    render: (o) => (
      <Link href={`/driver/orders/${o.id}`} className="text-[#ab3500] font-bold text-sm hover:underline">
        View
      </Link>
    ),
  },
];

/**
 * @param {object} props
 * @param {Array<any>} props.orders        — server-mapped order rows
 * @param {{ page: number, pages: number, total: number }} props.pagination
 */
export default function DriverOrdersTable({ orders, pagination }) {
  const [query, setQuery]     = useState('');
  const [activeTab, setTab]   = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const target = TAB_STATUS[activeTab];
    return orders.filter((o) => {
      if (target && o.status !== target) return false;
      if (!q) return true;
      return (
        (o.id ?? '').toLowerCase().includes(q)
        || (o.customer ?? '').toLowerCase().includes(q)
      );
    });
  }, [orders, query, activeTab]);

  return (
    <>
      <div className="mb-6 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search current page by order # or customer…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
        />
      </div>

      <section className="space-y-4">
        <div className="flex bg-slate-50 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
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

        <DataTable
          columns={COLUMNS}
          rows={filtered}
          emptyTitle={query ? 'No matches' : 'No orders yet'}
          emptyDescription={query ? 'Try a different search term.' : 'Your delivery history will show up here.'}
        />
      </section>

      <Paginator
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        hrefTemplate="/driver/orders?page={n}"
      />
    </>
  );
}
