'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * useAuthGuard — thin redirect wrapper around AuthContext.
 *
 * Redirects unauthenticated users to /login. When `requiredRole` is
 * passed, also redirects users whose role does not match to /dashboard
 * (the universally-accessible authenticated home). Role data comes from
 * AuthContext — no extra fetch.
 *
 * Anti-redirect-loop guards:
 *  1. Pathname guard — never redirect if already on the target route.
 *  2. In-flight latch on globalThis — at most one router.replace in flight
 *     across the whole app, survives HMR module re-evaluation, and resets
 *     once the user re-acquires a session.
 *
 * The router/pathname values from Next are stable across renders (router
 * is a singleton, pathname only mutates on navigation), so we depend on
 * them directly instead of stashing them in refs during render.
 */

const LOGIN = '/login';
const ROLE_FALLBACK = '/dashboard';
const DEBUG = process.env.NODE_ENV === 'development';

const g = globalThis;
if (!g.__authGuardState) {
  g.__authGuardState = { redirectInFlight: false };
}
const S = g.__authGuardState;

/**
 * @param {object} [opts]
 * @param {'customer'|'driver'|'admin'} [opts.requiredRole]
 */
export function useAuthGuard({ requiredRole } = {}) {
  const { user, role, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (pathname === LOGIN)   return;           // already there
      if (S.redirectInFlight)   return;           // another redirect in flight
      S.redirectInFlight = true;
      if (DEBUG) console.log('[useAuthGuard] redirecting to /login');
      router.replace(LOGIN);
      return;
    }

    // Valid session — release the latch so a future logout can redirect again.
    S.redirectInFlight = false;

    if (requiredRole && role && role !== requiredRole) {
      if (pathname === ROLE_FALLBACK) return;
      if (DEBUG) console.log(`[useAuthGuard] role mismatch: ${role} !== ${requiredRole}, redirecting to ${ROLE_FALLBACK}`);
      router.replace(ROLE_FALLBACK);
    }
  }, [user, role, loading, requiredRole, router, pathname]);

  return { user, role, loading };
}
