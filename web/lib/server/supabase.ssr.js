/**
 * Server-side Supabase client backed by the request cookies.
 *
 * Use this in Server Components, Server Actions, and route handlers when you
 * need the *current user's* session (read from cookies) — e.g. resolving who
 * the caller is in an RSC. It shares the same cookie store the browser client
 * (lib/supabase.js) and the proxy (proxy.js) read/write, so all three see one
 * session.
 *
 * Token refresh is handled centrally by the proxy on each request, so the
 * setAll() failure that happens when this is called from a (read-only) Server
 * Component is safe to swallow — the proxy will have already written any
 * refreshed cookies.
 *
 * Never import this from client components — it reads next/headers cookies,
 * which only exist on the server.
 */
import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSSRClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (read-only cookie store). Safe to
            // ignore — the proxy refreshes the session cookies on each request.
          }
        },
      },
    },
  );
}
