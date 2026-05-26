/**
 * Server-side admin Supabase client.
 *
 * Uses the SERVICE ROLE key — bypasses RLS entirely.
 * ONLY import this in server-side code (API routes, server actions).
 * NEVER expose this client or its key to the browser.
 *
 * Use cases:
 *   - Upserting profiles after auth (server trusts its own auth flow)
 *   - Any write that must succeed regardless of the user's JWT state
 */
import 'server-only';

import { createClient } from '@supabase/supabase-js';

let _adminClient = null;

export function getAdminSupabase() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to .env.local — ' +
      'find it at: Supabase Dashboard → Project Settings → API → service_role key.'
    );
  }

  _adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return _adminClient;
}
