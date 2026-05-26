'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getSession,
  onAuthStateChange,
  getMyProfile,
  logout as apiLogout,
} from '@/lib/api';

const AuthContext = createContext(null);

/**
 * AuthProvider — single source of truth for authentication state.
 *
 * Replaces the previous sessionStorage-based mock approach. The context
 * subscribes directly to Supabase and exposes real session data.
 *
 * Exposes: { user, role, profile, loading, isAuthenticated, logout }
 *
 * Note on logout():
 *   Clears the server-side HttpOnly session cookie, then signs out of
 *   Supabase. State is cleared automatically by the SIGNED_OUT event in
 *   onAuthStateChange — callers do not need to manually clear any state.
 */
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Hydrate from the existing Supabase session on first mount.
    async function init() {
      const { data: { session } } = await getSession();
      if (cancelled) return;

      if (session?.user) {
        // Release the auth barrier immediately — the profile DB round-trip
        // was previously blocking every page from rendering. Role/profile
        // now load in the background so pages are interactive right away.
        setUser(session.user);
        setLoading(false);

        const { data: prof } = await getMyProfile(session.user.id);
        if (!cancelled) {
          setRole(prof?.role ?? 'customer');
          setProfile(prof ?? null);
        }
      } else {
        setLoading(false);
      }
    }

    init();

    // Listen for subsequent auth events (sign-in after OTP, sign-out, token refresh).
    const { data: { subscription } } = onAuthStateChange(
      (event, session) => {
        if (cancelled) return;

        // INITIAL_SESSION duplicates the work init() already does — skip it.
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setRole('customer');
          setProfile(null);
          // Must call setLoading(false) here: if SIGNED_OUT fires before
          // init() completes (e.g. stale token rejected on mount), loading
          // would stay true forever without this.
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // Release loading barrier immediately — no page should wait for
          // the profile fetch before becoming interactive.
          setUser(session.user);
          setLoading(false);

          // CRITICAL: Do NOT await Supabase DB calls inside this callback.
          // Supabase awaits all onAuthStateChange listeners before resolving
          // setSession(). Calling supabase.from() here calls getSession()
          // internally, which contends with setSession()'s lock → deadlock.
          // Defer the profile fetch to the next event-loop tick to break
          // the chain and let setSession() resolve first.
          const userId = session.user.id;
          setTimeout(async () => {
            if (cancelled) return;
            const { data: prof } = await getMyProfile(userId);
            if (!cancelled) {
              setRole(prof?.role ?? 'customer');
              setProfile(prof ?? null);
            }
          }, 0);
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Unified logout: clear HttpOnly cookie + Supabase session.
  // State is reset automatically by the SIGNED_OUT event above.
  const logout = useCallback(() => apiLogout(), []);

  // Re-fetches the profiles row for the current user and updates context.
  // Call after any mutation that changes profile fields (name, etc.) so
  // every consumer of useAuth() / useDashboardData() sees fresh data
  // without a page reload. No-op when signed out.
  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await getMyProfile(user.id);
    if (error) {
      console.warn('[AuthContext.refreshProfile]', error.message);
      return null;
    }
    setRole(data?.role ?? 'customer');
    setProfile(data ?? null);
    return data;
  }, [user]);

  const value = {
    user,
    role,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    logout,
    refreshProfile,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
