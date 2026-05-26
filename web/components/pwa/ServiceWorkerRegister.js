'use client';

import { useEffect } from 'react';

/**
 * PWA lifecycle manager. Mounted app-wide in the root layout; renders nothing.
 *
 * Solves the classic "installed PWA stuck on old code" failure mode with three
 * layered defenses (see also the request timeout in lib/api/client.js):
 *
 *   1. Register the service worker (production only).
 *   2. Force an update check whenever the app regains focus, so an installed
 *      PWA picks up a new deploy instead of clinging to its install snapshot
 *      (iOS/Android only check lazily on their own).
 *   3. A build-version kill-switch: compare the build baked into this client
 *      (NEXT_PUBLIC_BUILD_ID) against /api/version (the live deploy, read
 *      fresh). On mismatch the client is provably running stale code, so we
 *      reload to the fresh version. Loop-safe: after the reload the client
 *      carries the new build id, so the ids match and it does not reload again.
 */

const RUNNING_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const swSupported =
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

    // ── Layer 1 + 2: register the SW and keep it fresh ──────────────────────
    let registration = null;

    // On the very first visit there is no controller yet: the SW activates and
    // clients.claim() fires `controllerchange`. We must NOT reload then, or
    // every new user suffers a jarring double-load. Only reload when a
    // controller was ALREADY in place (an update swapped it mid-session).
    const hadController = swSupported && Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    const onControllerChange = () => {
      if (!hadController) return;
      reloadOnce();
    };

    if (swSupported) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      const register = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .then((reg) => { registration = reg; })
          .catch((err) => console.warn('[sw] registration failed:', err?.message));
      };

      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    // ── Layer 3: build-version kill-switch ──────────────────────────────────
    // Ask the server which build is live; if we are older, recover.
    let checking = false;
    const checkForNewVersion = async () => {
      if (checking || reloaded) return;
      checking = true;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json();

        // Only act on a real, known mismatch. 'dev' (local) is ignored so we
        // never reload-loop outside production.
        if (
          buildId &&
          buildId !== 'dev' &&
          RUNNING_BUILD_ID !== 'dev' &&
          buildId !== RUNNING_BUILD_ID
        ) {
          // Nudge the SW to fetch the new worker/assets, then reload to the
          // fresh client bundle. The reload alone is enough to load new code
          // (HTML is network-first); update() just speeds the SW swap.
          try { await registration?.update(); } catch { /* non-fatal */ }
          reloadOnce();
        }
      } catch {
        // Offline or transient — try again on the next focus. Never throw.
      } finally {
        checking = false;
      }
    };

    // Run whenever the app comes to the foreground (the natural, safe moment
    // to refresh an installed PWA) and once shortly after mount.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (swSupported) { try { registration?.update(); } catch {} }
      checkForNewVersion();
    };
    document.addEventListener('visibilitychange', onVisible);
    const initialCheck = setTimeout(checkForNewVersion, 3000);

    return () => {
      clearTimeout(initialCheck);
      document.removeEventListener('visibilitychange', onVisible);
      if (swSupported) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
    };
  }, []);

  return null;
}
