/**
 * /admin/users — admin user directory (Server Component).
 *
 * Layout + stat tiles render server-side with the current page of users
 * inlined. AdminUsersTable is a client island that owns the COLUMNS
 * spec (non-serializable render callbacks) and the in-memory search.
 *
 * Pagination is URL-driven (?page=N) so back/forward and shareable
 * links work without JS.
 */
import { requireAuthRSC }      from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase }    from '@/lib/server/supabase.admin';
import { formatRelativeTime }  from '@/lib/utils/format';

import DashboardLayout  from '@/components/shared/DashboardLayout';
import PageHeader       from '@/components/shared/PageHeader';
import AdminUsersTable  from '@/components/admin/AdminUsersTable';

const PAGE_LIMIT = 20;

const AVATAR_CLASSES = [
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
];

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function StatBox({ label, value, sub, tone = 'neutral' }) {
  const subColor = tone === 'success' ? 'text-emerald-500' : 'text-slate-400';
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</span>
      <div>
        <div className="text-2xl font-extrabold text-[#0F1923] tracking-tight">{value}</div>
        <div className={`text-xs font-bold mt-1 ${subColor}`}>{sub}</div>
      </div>
    </div>
  );
}

/**
 * @param {{ searchParams: Promise<{ page?: string }> }} props
 */
export default async function AdminUsersPage({ searchParams }) {
  await requireAuthRSC({ allowedRoles: ['admin'] });

  const { page: pageParam } = await searchParams;
  const page  = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const limit = PAGE_LIMIT;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const { data: profiles, count } = await getAdminSupabase()
    .from('profiles')
    .select(
      'id, full_name, phone, email, role, created_at, orders:orders!orders_user_id_fkey(id, fare_amount, payment_status)',
      { count: 'exact' },
    )
    .in('role', ['customer'])
    .order('created_at', { ascending: false })
    .range(from, to);

  const users = (profiles ?? []).map((p, i) => {
    const userOrders = p.orders ?? [];
    const paidOrders = userOrders.filter((o) => o.payment_status === 'paid');
    const totalSpend = paidOrders.reduce((sum, o) => sum + (Number(o.fare_amount) || 0), 0);
    return {
      id:          p.id,
      name:        p.full_name ?? p.phone ?? 'Unknown',
      email:       p.email     ?? '',
      phone:       p.phone     ?? '',
      role:        p.role      ?? 'customer',
      orders:      userOrders.length,
      spend:       totalSpend > 0
        ? `₦${totalSpend.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '₦0.00',
      status:      'active',
      joined:      formatRelativeTime(p.created_at),
      initials:    getInitials(p.full_name ?? p.phone),
      avatarClass: AVATAR_CLASSES[i % AVATAR_CLASSES.length],
    };
  });

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  const activeUsers   = users.filter((u) => u.status === 'active').length;
  const businessUsers = users.filter((u) => u.role === 'business').length;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Users"
        subtitle={`${total.toLocaleString()} customers and business accounts on the platform.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total Users"        value={String(total)}        sub="All accounts" />
        <StatBox label="Active (this page)" value={String(activeUsers)}  sub="In good standing" tone="success" />
        <StatBox label="Business Accounts"  value={String(businessUsers)} sub="Verified merchants" />
        <StatBox label="New This Week"      value="—"                     sub="All time" />
      </div>

      <AdminUsersTable users={users} pagination={{ page, pages, total }} />
    </DashboardLayout>
  );
}
