// GoSwift Service Worker — conservative, offline-shell only.
//
// Design rules (deliberately strict to avoid the two classic Next-PWA bugs):
//   1. NEVER cache HTML/navigation responses (except the static /offline page).
//      → no stale authenticated shell, no post-deploy ChunkLoadError.
//   2. NEVER touch API / Supabase / RSC / authed requests.
//      → realtime offers, OTP, location pings, sessions always hit the network.
//   3. Only cache-first the immutable, content-hashed static assets.
//
// Bump VERSION on any change here so `activate` purges old caches.

const VERSION      = 'goswift-v1';
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL  = '/offline';

// Minimal app shell precached at install. Icons + offline page only —
// everything else is cached lazily on first use.
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      // addAll is atomic — if one URL 404s the whole install fails, so keep
      // this list to assets we know exist.
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function isStaticAsset(url) {
  // Content-hashed Next build output + our static icons/fonts. Safe to
  // cache-first because the filename changes whenever the content does.
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)
  );
}

function isBypassed(url, request) {
  // Anything dynamic, authed, or backend → never intercept/cache.
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.searchParams.has('_rsc') ||
    request.headers.has('Authorization') ||
    request.headers.get('RSC') === '1'
  );
}

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is ever cacheable.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Same-origin only — Supabase, Google Fonts, etc. go straight to network.
  if (url.origin !== self.location.origin) return;

  // Dynamic / authed / backend → leave to the network untouched.
  if (isBypassed(url, request)) return;

  // Page navigations: network-first, fall back to the offline page.
  // The response is intentionally NOT cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL, { ignoreSearch: true });
        // Guarantee a navigation never resolves to undefined (which would show
        // a raw browser error) even if the offline page got evicted from cache.
        return cached ?? new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>Offline</title><body style="margin:0;height:100vh;display:grid;place-items:center;' +
          'font-family:system-ui,sans-serif;background:#0F1923;color:#fff;text-align:center">' +
          '<div><h1 style="margin:0 0 8px">You\'re offline</h1>' +
          '<p style="color:#94a3b8">Check your connection and try again.</p></div></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        );
      }),
    );
    return;
  }

  // Immutable static assets: cache-first, populate on miss.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache successful, basic (same-origin) responses.
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Everything else: plain network (no caching).
});
