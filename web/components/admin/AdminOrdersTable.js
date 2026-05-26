'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import DataTable from '@/components/shared/DataTable';
import Paginator from '@/components/shared/Paginator';
import Badge     from '@/components/shared/Badge';

/**
 * Client island for the admin-orders table. Server feeds a page of
 * orders; this owns the COLUMNS render callbacks plus the tab + search
 * filter applied to the current page.
 */

const TABS = ['All', 'Active', 'Delivered', 'Cancelled'];
const TAB_STATUSES = {
  All:       null,
  Active:    new Set(['confirmed', 'processing', 'in_transit']),
  Delivered: new Set(['delivered']),
  Cancelled: new Set(['cancelled']),
};

const COLUMNS = [
  {
    key: 'id',
    label: 'Order #',
    render: (o) => <span className="font-bold text-[#0F1923]">#{o.id.slice(0, 8)}</span>,
  },
  {
    key: 'customer',
    label: 'Customer',
    render: (o) => (
      <div>
        <p className="font-semibold text-[#0F1923]">{o.customer}</p>
        <p className="text-xs text-slate-400">{o.customerPhone}</p>
      </div>
    ),
  },
  { key: 'route',  label: 'Route',  render: (o) => <span className="text-xs text-slate-500">{o.route}</span> },
  { key: 'status', label: 'Status', render: (o) => <Badge label={o.status} variant={o.status} /> },
  { key: 'driver', label: 'Driver', render: (o) => <span className="text-slate-700">{o.driver}</span> },
  { key: 'fare',   label: 'Fare',   render: (o) => <span className="font-semibold text-[#0F1923]">{o.fare}</span> },
  {
    key: 'view',
    label: 'Action',
    align: 'right',
    render: (o) => (
      <Link href={`/admin/orders/${o.id}`} className="text-[#ab3500] font-bold text-sm hover:underline">
        View
      </Link>
    ),
  },
];

/**
 * @param {object} props
 * @param {Array<any>} props.orders
 * @param {{ page: number, pages: number, total: number }} props.pagination
 */
export default function AdminOrdersTable({ orders, pagination }) {
  const [query, setQuery]   = useState('');
  const [activeTab, setTab] = useState('All');

  const filtered = useMemo(() => {
    const statusSet = TAB_STATUSES[activeTab];
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusSet && !statusSet.has(o.status)) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q)
        || (o.customer ?? '').toLowerCase().includes(q)
        || (o.driver   ?? '').toLowerCase().includes(q)
      );
    });
  }, [orders, activeTab, query]);

  return (
    <>
      <div className="mb-6 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search current page by order #, customer, or driver…"
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
          emptyDescription={query ? 'Try a different search term.' : 'When customers place orders, they’ll appear here.'}
        />
      </section>

      <Paginator
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        hrefTemplate="/admin/orders?page={n}"
      />
    </>
  );
}
