import 'server-only';

import { requireAuth }    from '@/lib/server/supabase.server';
import { getAdminSupabase } from '@/lib/server/supabase.admin';
import { forbidden }       from '@/lib/api/response';

/**
 * Validates that the incoming request carries a valid JWT belonging to an admin.
 * Returns { user } on success or { errorResponse } on failure.
 */
export async function requireAdmin(request) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) {
    console.warn('[requireAdmin] Auth validation failed');
    return { errorResponse };
  }

  const { data: profile, error: profileError } = await getAdminSupabase()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('[requireAdmin] Profile lookup failed for user', user?.id, ':', {
      code: profileError.code,
      message: profileError.message,
    });
    return {
      errorResponse: forbidden('User profile not found. Please sign in again.')
    };
  }

  if (profile?.role !== 'admin') {
    console.warn('[requireAdmin] Non-admin access attempt. User', user?.id, 'has role:', profile?.role);
    return {
      errorResponse: forbidden(`Admin access required. Your role is: ${profile?.role || 'unknown'}`)
    };
  }

  return { user };
}
