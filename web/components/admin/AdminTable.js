'use client';

import { useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/shared/Badge';

const TABS = ['All', 'Active', 'Delivered', 'Cancelled'];

function filterOrders(orders, tab) {
  if (tab === 'All') return orders;
  return orders.filter((o) => o.status === tab.toLowerCase());
}

function DriverAvatar({ initials }) {
  if (!initials) return <div className="w-7 h-7 rounded-full bg-slate-200" />;
  return (
    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-[10px]">
      {initials}
    </div>
  );
}

export default function AdminTable({ orders }) {
  const [activeTab, setActiveTab] = useState('All');
  const filtered = filterOrders(orders, activeTab);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] mb-8 overflow-hidden">
      <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[#0F1923]">Live Orders</h2>

        <div className="flex bg-slate-50 p-1 rounded-xl gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-180">
          <thead>
            <tr className="bg-slate-50/60 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <th className="px-5 md:px-6 py-4">Order #</th>
              <th className="px-5 md:px-6 py-4">Customer</th>
              <th className="px-5 md:px-6 py-4">Route</th>
              <th className="px-5 md:px-6 py-4">Status</th>
              <th className="px-5 md:px-6 py-4">Driver</th>
              <th className="px-5 md:px-6 py-4">Time</th>
              <th className="px-5 md:px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-sm">
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 md:px-6 py-4 font-bold text-[#0F1923] text-sm">
                    #{order.id}
                  </td>
                  <td className="px-5 md:px-6 py-4 text-sm text-slate-700">{order.customer}</td>
                  <td className="px-5 md:px-6 py-4 text-xs text-slate-400">{order.route}</td>
                  <td className="px-5 md:px-6 py-4">
                    <Badge label={order.status} variant={order.status} />
                  </td>
                  <td className="px-5 md:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <DriverAvatar initials={order.driverInitials} />
                      <span className="text-sm text-slate-700">{order.driver}</span>
                    </div>
                  </td>
                  <td className="px-5 md:px-6 py-4 text-sm text-slate-500">{order.time}</td>
                  <td className="px-5 md:px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-[#ab3500] font-bold text-sm hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
