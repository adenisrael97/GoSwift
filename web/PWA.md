# GoSwift PWA — How It Works & How To Debug It

This document explains the Progressive Web App (PWA) setup in plain language so
anyone on the team can understand, maintain, and debug it later.

> **One sentence to remember:** the **manifest** makes the app installable, the
> **icons** give it a face, and the **service worker** is a background middleman
> that decides — on every request — whether to use the internet or a saved copy.
> The `VERSION` line in `public/sw.js` is the switch that clears those saved
> copies when you ship changes.

---

## 1. What a PWA is

GoSwift is a normal Next.js website. A PWA is the *same site* plus a few small
files that let a phone treat it like an app: home-screen icon, full-screen
(no address bar), themed status bar, and an offline fallback.

We did **not** build a second app. If these files were deleted, GoSwift would
still work as a website — it just wouldn't be installable. That's the point of
"progressive": it's an enhancement layered on top.

A browser requires **three things** before it offers "Install":
1. A **manifest** (the app's ID card).
2. **HTTPS** (Vercel provides this; `localhost` also counts as secure).
3. A **service worker** (the offline/app-like behavior).

---

## 2. The files

| File | Role |
|------|------|
| `app/manifest.js` | The app's ID card: name, icons, colors, how it opens. |
| `public/sw.js` | The service worker (the "middleman"). |
| `app/offline/page.js` | The "you're offline" fallback page. |
| `components/pwa/ServiceWorkerRegister.js` | Turns the service worker on. |
| `components/pwa/InstallPrompt.js` | The "Install GoSwift" banner. |
| `assets/goswift-icon.svg`, `assets/goswift-icon-maskable.svg` | Source artwork for icons. |
| `scripts/generate-pwa-icons.mjs` | Turns the SVGs into PNG icons (`npm run pwa:icons`). |
| `public/icons/*.png`, `app/apple-icon.png` | The generated icons. |
| `app/layout.js` | Adds theme-color + Apple meta tags; mounts the two PWA components. |
| `next.config.mjs` | HTTP headers for `/sw.js` + basic security headers. |

### A) `app/manifest.js` — the ID card
A function returning the app description. Next.js 16 automatically serves it at
`/manifest.webmanifest` and injects `<link rel="manifest">` into every page.
Key fields: `name`, `short_name`, `start_url`, `display: 'standalone'`
(full-screen, no address bar), `theme_color`, `background_color`, `icons`.

### B) Icons
A vector logo (`assets/*.svg`) is rasterized into PNGs by
`scripts/generate-pwa-icons.mjs` (uses `sharp`, a **devDependency** — never runs
in production). Run with:
```
npm run pwa:icons
```
Outputs: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (extra padding so
Android's circular crop doesn't clip the logo), and the 180px Apple icon.

### C) `public/sw.js` — the service worker (middleman)
Runs in the background, separate from the page. Sits between the app and the
internet and decides, per request, whether to use the network or a saved copy.

Three life stages:
- **install** → pre-saves the offline page + icons.
- **activate** → deletes old caches from previous versions.
- **fetch** → runs on every request. Our rules, in order:
  1. Non-`GET` (forms, OTP) → network only, never cached.
  2. Other domains (Supabase, Google Fonts) → network only.
  3. API / login / live-data → **network only, never cached** (so you never see
     stale or wrong-account data).
  4. Page navigations → **try network first**, fall back to the saved offline
     page. Pages themselves are **never cached** (prevents showing a logged-out
     user a logged-in page, and prevents broken pages after a new deploy).
  5. Static assets (`/_next/static/*`, icons, CSS, fonts) → **saved copy first**
     ("cache-first"). Safe because these files have unique hashed names.

The line at the top:
```js
const VERSION = 'goswift-v1';
```
is the most important debugging lever. **Bump it (`v2`, `v3`, …) whenever you
change `sw.js` or the icons** so the browser discards the old cache and starts
fresh.

### D) `components/pwa/ServiceWorkerRegister.js` — the on switch
Registers `/sw.js`. Two deliberate behaviors:
- **Production only.** It does nothing in `npm run dev` (a caching worker would
  fight hot-reload and serve stale code). **You only see the PWA after
  `npm run build && npm run start`.**
- **Reloads only after a real update**, never on the first visit.

### E) `components/pwa/InstallPrompt.js` — the invitation
- **Android/Chrome:** catches the `beforeinstallprompt` event and shows our
  own "Install" button.
- **iPhone/Safari:** Apple forbids a programmatic install button, so we show
  manual "Share → Add to Home Screen" instructions instead.
- Hides when already installed; remembers dismissal for 14 days.

### F) `app/offline/page.js` — the offline sign
A simple branded "You're offline" page with a Try Again button. No login, no
data, so it always renders from cache.

### G) `app/layout.js` & `next.config.mjs`
Layout adds `theme_color`, Apple meta tags, and mounts the two PWA components.
Config sets `Cache-Control: no-cache` on `/sw.js` (always fetch a fresh worker)
plus three standard security headers on all pages.

---

## 3. How it fits together

```
Phone opens GoSwift
  ├─ reads <link rel="manifest"> ──► manifest.js   (name, icon, color)
  ├─ reads <link apple-touch-icon> ─► app/apple-icon.png
  ├─ ServiceWorkerRegister.js ──► registers /sw.js (production only)
  │      └─ sw.js: install (save offline page+icons) → activate (clear old caches)
  │               → fetch (network vs. saved copy, per request)
  ├─ InstallPrompt.js shows Install (Android) or iOS instructions
  └─ User taps Install → icon on home screen → launches start_url full-screen

Offline: a page request → network fails → sw.js serves the saved offline page.
Static files still load; API/private requests fail by design.
```

---

## 4. Debugging (Chrome DevTools → Application tab)

This tab is the PWA control panel:
- **Manifest** — shows name/icons/colors. A red error here means it won't be
  installable; the error text tells you what's wrong (usually a bad icon path).
- **Service Workers** — shows if the worker is "activated and running."
  - ✅ **Update on reload** — forces the newest worker each refresh (turn ON while
    developing PWA changes).
  - ✅ **Bypass for network** — ignore the worker temporarily (to check "is the SW
    causing this bug?").
  - **Unregister** — fully removes the worker (the reset).
- **Cache Storage** — see exactly which files are saved (e.g. `static-goswift-v1`).
- **Clear site data** — wipes worker + caches + storage. When in doubt, click
  this and hard-reload.

**Test installability honestly** (PWA is off in dev):
```
npm run build && npm run start
```
**Automated grade:** DevTools → **Lighthouse** → check "Progressive Web App" →
Analyze.

---

## 5. The 3 most likely future problems (and fixes)

1. **"I changed something but the app shows the old version."**
   The service worker is serving a saved copy. → Bump `VERSION` in `public/sw.js`,
   rebuild, redeploy. Quick local fix: DevTools → Application → **Clear site data**
   → hard reload.

2. **"The Install button never appears."**
   Check in order: HTTPS or localhost? Ran `build && start` (not `dev`)? Any red
   error in the **Manifest** panel? Do the 192 and 512 icon URLs actually load?
   On iPhone there is no button — it's **Share → Add to Home Screen** (Apple's rule).

3. **"The new icon won't update on the home screen."**
   Icons are cached hard by the OS and the worker. → `npm run pwa:icons`, bump
   `VERSION`, redeploy; the user may need to remove + re-add the installed app.

---

## 6. Maintenance checklist when changing the PWA

- Changed `public/sw.js` or any icon? → **bump `VERSION`** in `sw.js`.
- Changed the logo? → edit `assets/goswift-icon*.svg` → `npm run pwa:icons`.
- Always verify with `npm run build && npm run start`, not `npm run dev`.

---

## 7. Not included yet (future "Phase 2")

- **Web push notifications** (VAPID keys, `web-push`, a Supabase subscriptions
  table, tapping a notification opening a specific order/offer).
- **Background sync** for queued driver location pings while offline.
- **Richer offline data** (e.g. cached read-only order history).
