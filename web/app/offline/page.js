'use client';

// Offline fallback served by the service worker when a navigation fails with
// no network. Intentionally static: no auth, no data fetching, no providers
// needed — it must render from cache alone. Kept out of the proxy.js matcher
// so it's always reachable.

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0F1923] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-[#ff6b35]/10 flex items-center justify-center mb-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-[#ff6b35]">
          <path
            d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="text-white text-2xl font-extrabold tracking-tight mb-2">
        You&apos;re offline
      </h1>
      <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-8">
        GoSwift can&apos;t reach the network right now. Check your connection and
        try again — your session is safe.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-[#ff6b35] hover:bg-[#ab3500] text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-colors active:scale-95"
      >
        Try Again
      </button>
    </div>
  );
}
