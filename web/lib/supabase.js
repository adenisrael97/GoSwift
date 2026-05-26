import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser-side Supabase client.
//
// Uses @supabase/ssr's createBrowserClient so the auth session is stored in
// COOKIES (not localStorage). Cookies are readable by the server (proxy.js,
// Server Components, route handlers), which lets the proxy refresh + re-issue
// the session on every request. That server-managed refresh is what keeps
// users logged in across reloads and — critically — survives the installed
// PWA case on iOS, where localStorage gets purged after ~7 days of non-use.
//
// detectSessionInUrl is disabled to preserve the password-recovery flow, which
// parses recovery tokens from the URL manually (see lib/api/auth.js →
// verifyRecoveryLink). Letting the client auto-process the URL hash would
// double-handle those links.
//
// Singleton guard — prevents multiple GoTrueClient instances when Next.js
// evaluates this module across different chunks or during HMR in development.
const g = globalThis;
if (!g.__supabaseClient) {
  g.__supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: { detectSessionInUrl: false },
  });
  g.__supabaseClientCreatedAt = Date.now();
  if (process.env.NODE_ENV === 'development') {
    console.log('[supabase] CLIENT CREATED (first time)');
  }
} else if (process.env.NODE_ENV === 'development') {
  console.log(`[supabase] reusing existing client (created ${Date.now() - g.__supabaseClientCreatedAt}ms ago) — singleton intact`);
}

export const supabase = g.__supabaseClient;
