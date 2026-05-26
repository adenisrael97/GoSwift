import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { ok, serverError }  from '@/lib/api/response';
import { withLogger }       from '@/lib/api/withLogger';
import { DEFAULT_VEHICLE_PRICING } from '../../../../shared/constants/vehicleRates';

/**
 * GET /api/pricing — public read of the admin-configured per-vehicle pricing.
 *
 * Pricing is shown directly to the user on the order form, so it isn't
 * sensitive. Falls back to the bundled defaults if admin_settings is
 * unreachable, which keeps the UI usable during outages.
 */
export const GET = withLogger('pricing.get', async () => {
  try {
    const { data, error } = await getAdminSupabase()
      .from('admin_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('[GET /api/pricing]', error.message);
      return ok({ vehicles: DEFAULT_VEHICLE_PRICING });
    }

    const vehicles = data?.settings?.pricing?.vehicles ?? DEFAULT_VEHICLE_PRICING;
    return ok({ vehicles });
  } catch (err) {
    console.error('[GET /api/pricing] unexpected', err);
    return serverError('Failed to load pricing');
  }
});
