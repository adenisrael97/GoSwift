import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError } from '@/lib/api/response';
import { validateQuery }   from '@/lib/api/validate';
import { PaginationSchema } from '@/lib/api/schemas/admin';
import { formatRelativeTime } from '@/lib/utils/format';
import { withLogger } from '@/lib/api/withLogger';

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

export const GET = withLogger('admin.users.get', async (request) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { data: query, errorResponse: queryErr } = validateQuery(request, PaginationSchema);
  if (queryErr) return queryErr;
  const { page, limit } = query;

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  const { data: profiles, error, count } = await getAdminSupabase()
    .from('profiles')
    .select(
      'id, full_name, phone, email, role, created_at, orders:orders!orders_user_id_fkey(id, fare_amount, payment_status)',
      { count: 'exact' }
    )
    .in('role', ['customer'])
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[GET /api/admin/users]', error.message);
    return serverError('Failed to fetch users');
  }

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
      spend:       totalSpend > 0 ? `₦${totalSpend.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₦0.00',
      status:      'active',
      joined:      formatRelativeTime(p.created_at),
      initials:    getInitials(p.full_name ?? p.phone),
      avatarClass: AVATAR_CLASSES[i % AVATAR_CLASSES.length],
    };
  });

  return ok({
    users,
    pagination: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
});
