'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * PWA lifecycle manager + "new version available" banner. Mounted app-wide in
 * the root layout.
 *
 * Solves the classic "installed PWA stuck on old code" failure mode with three
 * layered defenses (the third — a request timeout — lives in lib/api/client.js):
 *
 *   1. Register the service worker (production only).
 *   2. Force an update check whenever the app regains focus, so an installed
 *      PWA picks up a new deploy instead of clinging to its install snapshot
 *      (iOS/Android only check lazily on their own).
 *   3. A build-version kill-switch: compare the build baked into this client
 *      (NEXT_PUBLIC_BUILD_ID) against /api/version (the live deploy, read
 *      fresh). A mismatch proves the client is running stale code.
 *
 * When a newer version is detected we do NOT reload automatically (that can
 * interrupt someone mid-form). Instead we surface a dismissible banner and let
 * the user tap "Refresh". The reload then fetches fresh HTML (network-first)
 * and the new code. Refreshing is loop-safe: the reloaded client carries the
 * new build id, so it matches the server and the banner does not return.
 */

const RUNNING_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Refs (not state) for control flags so they survive the re-render that
  // happens when the banner appears, and so listeners read live values.
  const dismissedRef = useRef(false);
  const checkingRef  = useRef(false);
  const regRef       = useRef(null);

  useEffect(() => {
    // SW + version checks are a production concern. In dev a cache-first SW
    // would serve stale Turbopack chunks and break Fast Refresh.
    if (process.env.NODE_ENV !== 'production') return;

    const swSupported =
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

    const announceUpdate = () => {
      if (dismissedRef.current) return; // respect a dismissal for this session
      setUpdateAvailable(true);
    };

    // ── Layers 1 & 2: register the SW and keep it fresh ─────────────────────
    // On the very first visit there is no controller yet: the SW activates and
    // clients.claim() fires `controllerchange`. We must NOT treat that as an
    // update (it would nag a brand-new visitor). Only a controller swap on a
    // session that ALREADY had one is a real update.
    const hadController =
      swSupported && Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      if (hadController) announceUpdate();
    };

    if (swSupported) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      const register = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .then((reg) => { regRef.current = reg; })
          .catch((err) => console.warn('[sw] registration failed:', err?.message));
      };

      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    // ── Layer 3: build-version kill-switch (works even without a SW) ────────
    const checkForNewVersion = async () => {
      if (checkingRef.current || dismissedRef.current) return;
      checkingRef.current = true;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json();

        // Only act on a real, known mismatch. 'dev' (local / unset) is ignored
        // on either side so we never show the banner outside production.
        if (
          buildId &&
          buildId !== 'dev' &&
          RUNNING_BUILD_ID !== 'dev' &&
          buildId !== RUNNING_BUILD_ID
        ) {
          announceUpdate();
        }
      } catch {
        // Offline or transient — try again on the next focus. Never throw.
      } finally {
        checkingRef.current = false;
      }
    };

    // Check when the app comes to the foreground (the natural moment an
    // installed PWA should refresh) and once shortly after mount.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (swSupported) { try { regRef.current?.update(); } catch { /* non-fatal */ } }
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

  if (!updateAvailable) return null;

  const refresh = () => {
    // Best-effort: pull the newest worker/assets, then reload to the fresh
    // client bundle. The reload alone is enough (HTML is network-first);
    // update() just nudges the SW swap along.
    try { regRef.current?.update?.(); } catch { /* non-fatal */ }
    window.location.reload();
  };

  const dismiss = () => {
    dismissedRef.current = true;
    setUpdateAvailable(false);
  };

  return (
    <div
      className="fixed bottom-4 inset-x-4 z-110 mx-auto max-w-md"
      role="status"
      aria-live="polite"
    >
      <div className="bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(15,25,35,0.35)] border border-slate-100 p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <RefreshCw size={20} className="text-[#ff6b35]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">Update available</p>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            A newer version of GoSwift is ready.
          </p>
        </div>

        <button
          onClick={refresh}
          className="bg-[#ff6b35] hover:bg-[#ab3500] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors active:scale-95 shrink-0"
        >
          Refresh
        </button>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-slate-400 hover:text-slate-600 shrink-0 -mt-1 -mr-1 p-1"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
