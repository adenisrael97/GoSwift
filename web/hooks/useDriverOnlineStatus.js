'use client';

import { useState, useCallback } from 'react';
import { setDriverOnline } from '@/lib/api';

/**
 * useDriverOnlineStatus
 *
 * Manages a driver's online/offline state as a pure API-backed toggle.
 * Intentionally decoupled from GPS — going online no longer requires
 * a location fix. GPS runs alongside as an independent enhancement.
 *
 * This separation is load-bearing for the PWA rollout: background GPS
 * is unreliable on iOS PWA and low-end Android. Drivers must never be
 * blocked from working because the device lost its GPS signal.
 *
 * Returns:
 *   isOnline           — current persisted state (optimistic)
 *   toggling           — true while the PATCH is in-flight (disables the button)
 *   statusError        — string | null  (last error, cleared by toggle or clearError)
 *   toggle()           — async; flips the state and calls the API
 *   clearError()       — clear statusError without toggling
 *   setOnlineFromServer(bool) — seed the state from server-fetched data on mount;
 *                               safe to call multiple times (idempotent after first call)
 */
export function useDriverOnlineStatus() {
  const [isOnline,    setIsOnline]    = useState(false);
  const [toggling,    setToggling]    = useState(false);
  const [statusError, setStatusError] = useState(null);
  // Tracks whether we have received the authoritative value from the server.
  // Prevents setOnlineFromServer from overwriting a driver-initiated toggle
  // that happened before the first data load returned.
  const [seeded, setSeeded] = useState(false);

  const toggle = useCallback(async () => {
    if (toggling) return false;
    setStatusError(null);

    const next = !isOnline;
    setToggling(true);
    setIsOnline(next); // optimistic flip

    const { ok, body } = await setDriverOnline(next);

    if (!ok) {
      setIsOnline(!next); // rollback on failure
      setStatusError(body?.error ?? 'Could not update your status. Please try again.');
    }

    setToggling(false);
    return ok;
  }, [isOnline, toggling]);

  const clearError = useCallback(() => setStatusError(null), []);

  // Called once after the dashboard fetches the driver's stored online state.
  // We only seed on the first call — if the driver toggled during the load
  // window we don't want to clobber their intent.
  const setOnlineFromServer = useCallback((online) => {
    if (seeded) return;
    setIsOnline(Boolean(online));
    setSeeded(true);
  }, [seeded]);

  return { isOnline, toggling, statusError, toggle, clearError, setOnlineFromServer };
}
