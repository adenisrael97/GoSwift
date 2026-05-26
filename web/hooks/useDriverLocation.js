'use client';

import { useEffect, useRef, useState } from 'react';
import { postDriverLocation } from '@/lib/api';

/**
 * useDriverLocation
 *
 * Watches the device GPS via navigator.geolocation.watchPosition and
 * throttle-posts coordinates to /api/driver/location while the driver
 * is active. Fully decoupled from online status — the caller decides
 * when to start/stop tracking by toggling `enabled`.
 *
 * Status values (maps 1-to-1 to product UX states):
 *   'idle'        — tracking not started (enabled=false)
 *   'acquiring'   — watchPosition started, waiting for first fix
 *   'available'   — live fix in hand
 *   'denied'      — user denied browser permission (non-recoverable)
 *   'unavailable' — hardware/network error after exhausting retries
 *
 * Returns:
 *   status          — one of the values above
 *   coords          — { lat, lng } | null  (resets on error/tab-hide)
 *   lastKnownCoords — { lat, lng } | null  (survives temporary failures)
 *   lastKnownAt     — Date | null          (timestamp of last good fix)
 *   hasLiveLocation — true when status='available' and fix is fresh
 *   error           — string | null        (diagnostic message)
 *
 * Design decisions:
 * - Tab visibility: clears the watcher when hidden, restarts on focus.
 *   Prevents dead watchPosition instances draining battery on low-end
 *   Android devices where background GPS tracking is unreliable.
 * - Retry: POSITION_UNAVAILABLE and TIMEOUT are transient — we retry
 *   up to MAX_RETRIES times with exponential backoff before giving up.
 *   PERMISSION_DENIED is permanent — we stop immediately.
 * - Duplicate watcher guard: `watchIdRef` is checked before each
 *   watchPosition call so a React re-render or visibility flap never
 *   spawns two concurrent watchers.
 * - PWA future-proofing: all cleanup happens in a single `clearWatcher`
 *   closure. When we later add a service worker that relays location
 *   events we only need to touch that one place.
 */

const POST_INTERVAL_MS   = 10_000; // never POST location more often than this
const STALE_THRESHOLD_MS = 30_000; // fixes older than 30s don't count as "live"
const MAX_RETRIES        = 3;
const RETRY_BASE_MS      = 3_000;  // backoff: 3s → 6s → 9s

export function useDriverLocation({ enabled = false } = {}) {
  const [status,          setStatus]          = useState('idle');
  const [coords,          setCoords]          = useState(null);
  const [lastKnownCoords, setLastKnownCoords] = useState(null);
  const [lastKnownAt,     setLastKnownAt]     = useState(null);
  const [hasLiveLocation, setHasLiveLocation] = useState(false);
  const [error,           setError]           = useState(null);

  // All mutable imperative state lives in refs — React state is output only.
  const watchIdRef    = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const lastPostRef   = useRef(0);
  const inFlightRef   = useRef(false);
  // Mirror of the `enabled` prop so callbacks inside watchPosition can
  // read it without closing over a stale value from an old effect run.
  const enabledRef    = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    // SSR / server-component guard — navigator only exists in browsers.
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;

    // ── Helpers ────────────────────────────────────────────────
    function clearRetryTimer() {
      if (retryTimerRef.current != null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }

    function clearWatcher() {
      if (watchIdRef.current != null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearRetryTimer();
    }

    function startWatch() {
      if (!enabledRef.current) return;
      if (watchIdRef.current != null) return; // already watching — prevent duplicates

      if (!navigator.geolocation) {
        setStatus('unavailable');
        setError('Geolocation is not supported in this browser');
        return;
      }

      setStatus('acquiring');
      setError(null);

      watchIdRef.current = navigator.geolocation.watchPosition(
        // ── Success handler ──────────────────────────────────
        (pos) => {
          retryCountRef.current = 0; // successful fix resets the retry counter

          const lat    = pos.coords.latitude;
          const lng    = pos.coords.longitude;
          const fixAge = Date.now() - pos.timestamp;
          const fresh  = fixAge < STALE_THRESHOLD_MS;

          setStatus('available');
          setError(null);
          setCoords({ lat, lng });
          setLastKnownCoords({ lat, lng });
          setLastKnownAt(new Date(pos.timestamp));
          setHasLiveLocation(fresh);

          // Throttled backend write — at 2-3K concurrent drivers a
          // per-second write would spike Postgres. 10s cadence keeps
          // dispatch matching accurate while staying within budget.
          const now = Date.now();
          if (now - lastPostRef.current < POST_INTERVAL_MS) return;
          if (inFlightRef.current) return;
          lastPostRef.current = now;
          inFlightRef.current = true;
          postDriverLocation({ lat, lng })
            .catch(err => console.warn('[useDriverLocation] POST failed:', err?.message))
            .finally(() => { inFlightRef.current = false; });
        },

        // ── Error handler ────────────────────────────────────
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            // User explicitly denied — stop immediately, no retry.
            clearWatcher();
            setStatus('denied');
            setHasLiveLocation(false);
            setCoords(null);
            setError('Location permission denied');
            return;
          }

          // POSITION_UNAVAILABLE (2) or TIMEOUT (3) — transient errors.
          // Retry with exponential backoff before flagging as unavailable.
          clearWatcher();
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            const delay = RETRY_BASE_MS * retryCountRef.current;
            setStatus('acquiring');
            setCoords(null);
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              startWatch();
            }, delay);
          } else {
            setStatus('unavailable');
            setHasLiveLocation(false);
            setCoords(null);
            setError(err.message ?? 'Could not get your location');
          }
        },

        {
          enableHighAccuracy: true,
          maximumAge:         5_000,  // accept cached fix up to 5s old
          timeout:            20_000, // give the browser 20s to get a fix
        },
      );
    }

    // ── Tab visibility handling ─────────────────────────────────────────
    // watchPosition keeps running in a background tab on some browsers but
    // returns stale or no-op fixes. Clearing and restarting on visibility
    // change ensures the driver always gets a fresh fix on resume, and
    // avoids wasted battery on low-end Android when the tab is hidden.
    function handleVisibilityChange() {
      if (!enabledRef.current) return;
      if (document.hidden) {
        clearWatcher();
        // Keep lastKnownCoords intact — we don't lose the last position.
        setCoords(null);
        setHasLiveLocation(false);
        setStatus('acquiring'); // signals "will restart soon" — not a permanent failure
      } else {
        retryCountRef.current = 0;
        startWatch();
      }
    }

    // ── Main lifecycle ──────────────────────────────────────────────────
    if (!enabled) {
      clearWatcher();
      setStatus('idle');
      setCoords(null);
      setHasLiveLocation(false);
      setError(null);
      return;
    }

    retryCountRef.current = 0;
    startWatch();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearWatcher();
      // Reset live state on disable — keeps lastKnownCoords for dispatch
      // fallback if the driver reconnects quickly.
      setStatus('idle');
      setCoords(null);
      setHasLiveLocation(false);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ enabledRef keeps callbacks in sync; startWatch/clearWatcher are
  //   stable closures inside the effect. Safe to omit from deps.

  return { status, coords, lastKnownCoords, lastKnownAt, hasLiveLocation, error };
}
