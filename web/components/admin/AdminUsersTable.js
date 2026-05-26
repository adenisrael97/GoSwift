'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import DataTable from '@/components/shared/DataTable';
import Paginator from '@/components/shared/Paginator';
import Badge     from '@/components/shared/Badge';

/**
 * Client island for the admin-users table. The server fetches the page
 * of users and renders the shell; this owns the COLUMNS spec (which
 * uses non-serializable render callbacks) plus the in-memory search
 * filter on the current page.
 */

const COLUMNS = [
  {
    key: 'name',
    label: 'User',
    render: (u) => (
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.avatarClass}`}>
          {u.initials}
        </div>
        <div>
          <p className="font-bold text-[#0F1923]">{u.name}</p>
          <p className="text-xs text-slate-400">{u.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'role',
    label: 'Role',
    render: (u) => (
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{u.role}</span>
    ),
  },
  { key: 'phone',  label: 'Phone',  render: (u) => <span className="text-slate-700 text-xs">{u.phone}</span> },
  { key: 'orders', label: 'Orders', render: (u) => <span className="font-semibold text-[#0F1923]">{u.orders}</span> },
  { key: 'spend',  label: 'Total Spend', render: (u) => <span className="font-semibold text-[#0F1923]">{u.spend}</span> },
  {
    key: 'status',
    label: 'Status',
    render: (u) => <Badge label={u.status} variant={u.status === 'active' ? 'success' : 'cancelled'} />,
  },
  { key: 'joined', label: 'Joined', render: (u) => <span className="text-xs text-slate-500">{u.joined}</span> },
];

/**
 * @param {object} props
 * @param {Array<any>} props.users
 * @param {{ page: number, pages: number, total: number }} props.pagination
 */
export default function AdminUsersTable({ users, pagination }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name  ?? '').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q)
      || (u.phone ?? '').toLowerCase().includes(q),
    );
  }, [users, query]);

  return (
    <>
      <div className="mb-6 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 px-4 py-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search current page by name, email, or phone…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
        />
      </div>

      <DataTable
        columns={COLUMNS}
        rows={filtered}
        emptyTitle={query ? 'No matches' : 'No users found'}
        emptyDescription={query ? 'Try a different search term.' : 'Customers will appear here once they sign up.'}
      />

      <Paginator
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        hrefTemplate="/admin/users?page={n}"
      />
    </>
  );
}
