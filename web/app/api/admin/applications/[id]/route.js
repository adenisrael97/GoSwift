import { requireAdmin }   from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, notFound, serverError } from '@/lib/api/response';
import { withLogger } from '@/lib/api/withLogger';

export const GET = withLogger('admin.applications.get', async (request, { params }) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;

  const { data, error } = await getAdminSupabase()
    .from('driver_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return notFound('Application not found');

  return ok({ application: data });
});
