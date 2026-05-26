import { requireAdmin }    from '@/lib/server/adminGuard';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError }  from '@/lib/api/response';
import { withLogger } from '@/lib/api/withLogger';

export const GET = withLogger('admin.drivers.get', async (request) => {
  const { errorResponse } = await requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { data, error } = await getAdminSupabase()
    .from('profiles')
    .select(`
      id, full_name, phone,
      driver_profiles ( vehicle_model, vehicle_type, plate_number, is_online )
    `)
    .eq('role', 'driver')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[GET /api/admin/drivers]', error.message);
    return serverError('Failed to fetch drivers');
  }

  const drivers = (data ?? []).map((d) => ({
    id:       d.id,
    name:     d.full_name ?? d.phone ?? 'Unknown',
    phone:    d.phone ?? '',
    vehicle:  d.driver_profiles?.vehicle_model ?? null,
    plate:    d.driver_profiles?.plate_number  ?? null,
    type:     d.driver_profiles?.vehicle_type  ?? null,
    isOnline: d.driver_profiles?.is_online     ?? false,
  }));

  return ok({ drivers });
});
