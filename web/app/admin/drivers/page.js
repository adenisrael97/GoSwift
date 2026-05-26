/**
 * /admin/drivers — driver-applications dashboard (Server Component).
 *
 * Counts come from a four-way Promise.all (the list + the three status
 * counts) so the stat tiles reflect global totals, not just page 1.
 * ApplicationList stays client because it owns search + filter state
 * over the visible page.
 */
import { requireAuthRSC }      from '@/lib/server/getAuthFromCookie';
import { getAdminSupabase }    from '@/lib/server/supabase.admin';
import { mapDbApplication }    from '@/lib/utils/mapAdminData';

import DashboardLayout  from '@/components/shared/DashboardLayout';
import PageHeader       from '@/components/shared/PageHeader';
import ApplicationList  from '@/components/admin/ApplicationList';
import Paginator        from '@/components/shared/Paginator';

const PAGE_LIMIT = 20;

/**
 * @param {{ searchParams: Promise<{ page?: string }> }} props
 */
export default async function AdminDriversPage({ searchParams }) {
  await requireAuthRSC({ allowedRoles: ['admin'] });

  const { page: pageParam } = await searchParams;
  const page  = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const limit = PAGE_LIMIT;
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const admin = getAdminSupabase();

  const [{ data: list, count }, pendingC, approvedC, rejectedC] = await Promise.all([
    admin.from('driver_applications')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(from, to),
    admin.from('driver_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('driver_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    admin.from('driver_applications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  const applications = (list ?? []).map((a, i) => mapDbApplication(a, i));

  const counts = {
    pending:  pendingC.count  ?? 0,
    approved: approvedC.count ?? 0,
    rejected: rejectedC.count ?? 0,
  };
  counts.total = counts.pending + counts.approved + counts.rejected;

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  const stats = [
    { label: 'Total',    value: String(counts.total),    sub: 'All applications',   subColor: 'text-slate-500'    },
    { label: 'Pending',  value: String(counts.pending),  sub: 'Requires Attention', subColor: 'text-amber-500'    },
    { label: 'Approved', value: String(counts.approved), sub: 'Verified Fleet',     subColor: 'text-emerald-500'  },
    { label: 'Rejected', value: String(counts.rejected), sub: 'Compliance Issues',  subColor: 'text-red-500'      },
  ];

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title="Driver Applications"
        subtitle="Review and manage onboarding requests for your delivery fleet."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, subColor }) => (
          <div
            key={label}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              {label}
            </span>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
              <div className={`text-xs font-bold mt-1 ${subColor}`}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <ApplicationList applications={applications} />

      <Paginator
        page={page}
        pages={pages}
        total={total}
        hrefTemplate="/admin/drivers?page={n}"
      />
    </DashboardLayout>
  );
}
