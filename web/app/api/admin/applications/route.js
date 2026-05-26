import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError } from '@/lib/api/response';
import { validateQuery }   from '@/lib/api/validate';
import { ApplicationsQuerySchema } from '@/lib/api/schemas/admin';
import { withLogger } from '@/lib/api/withLogger';

/**
 * GET /api/admin/applications
 *
 * Query params:
 *   • page=N          — 1-based, default 1
 *   • limit=N         — capped at 100, default 20
 *   • status=pending|approved|rejected — optional server-side filter
 *
 * Always returns counts: { pending, approved, rejected, total } so callers
 * (e.g. the admin dashboard pending-applications tile) don't have to
 * compute counts from page 1 of the list — which would be wrong when
 * there are more applications than fit on a single page.
 */
export const GET = withLogger('admin.applications.get', async (request) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { data: query, errorResponse: queryErr } = validateQuery(request, ApplicationsQuerySchema);
  if (queryErr) return queryErr;
  const { page, limit, status } = query;

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  const admin = getAdminSupabase();

  // List query — optionally filtered by status.
  let listQuery = admin
    .from('driver_applications')
    .select('*', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(from, to);
  if (status) listQuery = listQuery.eq('status', status);

  // Counts query — cheap (head=true + count=exact) and powered by the
  // driver_applications_status_idx partial index from migration 006.
  const [{ data, error, count }, pendingC, approvedC, rejectedC] = await Promise.all([
    listQuery,
    admin.from('driver_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('driver_applications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    admin.from('driver_applications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  if (error) {
    console.error('[GET /api/admin/applications]', error.message);
    return serverError('Failed to fetch applications');
  }

  const counts = {
    pending:  pendingC.count  ?? 0,
    approved: approvedC.count ?? 0,
    rejected: rejectedC.count ?? 0,
  };
  counts.total = counts.pending + counts.approved + counts.rejected;

  return ok({
    applications: data ?? [],
    counts,
    pagination: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
});
