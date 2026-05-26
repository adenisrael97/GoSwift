'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker once, after the window has loaded so SW
 * registration never competes with first paint. Mounted app-wide in the
 * root layout. Renders nothing.
 *
 * `updateViaCache: 'none'` + the no-cache header on /sw.js (see
 * next.config.mjs) means the worker script itself is never served stale,
 * so a new deploy's SW is always picked up.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // Never register in dev: a cache-first SW would cache Turbopack HMR chunks
    // and serve stale JS, breaking Fast Refresh. SW is a production concern.
    if (process.env.NODE_ENV !== 'production') return;

    // On the very first visit there is no controller yet: the SW activates and
    // clients.claim() fires `controllerchange`. We must NOT reload then, or every
    // new user suffers a jarring double-load. Only reload when a controller was
    // ALREADY in place (i.e. an update swapped it mid-session).
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    const onControllerChange = () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => console.warn('[sw] registration failed:', err?.message));
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
