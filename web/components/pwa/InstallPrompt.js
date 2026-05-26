'use client';

import { useEffect, useState } from 'react';
import { X, Share, Plus } from 'lucide-react';

const DISMISS_KEY    = 'goswift_install_dismissed_at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // re-ask after 14 days

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at && Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Dismissible "install GoSwift" banner.
 *
 * - Android / Chromium: capture the `beforeinstallprompt` event and drive a
 *   native install via prompt().
 * - iOS Safari: no programmatic prompt exists, so show the manual
 *   Share → "Add to Home Screen" instructions.
 * - Hidden entirely when already installed (standalone display mode) or
 *   recently dismissed.
 *
 * `mode` is a single piece of state ('hidden' | 'ios' | 'android') so the
 * one-time, browser-API-driven setup only ever fires one setState.
 */
export default function InstallPrompt() {
  const [mode,           setMode]           = useState('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // navigator.standalone is a non-standard iOS Safari flag (not in lib.dom).
      /** @type {any} */ (window.navigator).standalone === true;
    if (standalone || recentlyDismissed()) return;

    const ios = /ipad|iphone|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
                // MSStream: legacy IE/Edge global used to exclude old Windows Phones.
                !(/** @type {any} */ (window).MSStream);

    if (ios) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('ios');
      return;
    }

    // Android / Chromium — wait for the browser to offer the install. These
    // setStates run from event callbacks, not synchronously in the effect.
    const onBeforeInstall = (e) => {
      e.preventDefault(); // suppress the mini-infobar; we drive our own UI
      setDeferredPrompt(e);
      setMode('android');
    };
    const onInstalled = () => setMode('hidden');

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setMode('hidden');
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setMode('hidden');
  }

  if (mode === 'hidden') return null;
  const isIOS = mode === 'ios';

  return (
    <div className="fixed bottom-4 inset-x-4 z-[100] mx-auto max-w-md">
      <div className="bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(15,25,35,0.35)] border border-slate-100 p-4 flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">Install GoSwift</p>
          {isIOS ? (
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              Tap <Share size={12} className="inline -mt-0.5 text-[#ff6b35]" /> then{' '}
              <span className="font-semibold text-slate-700">Add to Home Screen</span>
              {' '}<Plus size={12} className="inline -mt-0.5 text-[#ff6b35]" /> to install.
            </p>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              Add it to your home screen for a faster, app-like experience.
            </p>
          )}

          {!isIOS && (
            <button
              onClick={install}
              className="mt-2.5 bg-[#ff6b35] hover:bg-[#ab3500] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors active:scale-95"
            >
              Install
            </button>
          )}
        </div>

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
