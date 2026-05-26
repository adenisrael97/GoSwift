import 'server-only';

import { requireAuth }      from '@/lib/server/supabase.server';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { forbidden }        from '@/lib/api/response';

/**
 * Authentication + role guard for /api/driver/* routes.
 *
 * Returns { user, supabase } on success or { errorResponse } on failure.
 * The returned `supabase` is a user-scoped client (JWT forwarded) so RLS
 * policies enforce row-level ownership on every subsequent query.
 *
 * Usage:
 *   const { user, supabase, errorResponse } = await requireDriver(request);
 *   if (errorResponse) return errorResponse;
 */
export async function requireDriver(request) {
  const { user, supabase, errorResponse } = await requireAuth(request);
  if (errorResponse) return { errorResponse };

  const { data: profile } = await getAdminSupabase()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'driver') {
    return { errorResponse: forbidden('Driver access required') };
  }

  return { user, supabase, errorResponse: null };
}
