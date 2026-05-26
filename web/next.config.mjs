import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // outputFileTracingRoot stays at the monorepo root so `../shared/` is
  // bundled into deployments. We do NOT widen turbopack.root the same
  // way: doing so dragged the React Native `app/` tree (its own
  // node_modules, ios/, android/) into Turbopack's dep graph and made
  // Tailwind v4 + PostCSS spawn hundreds of worker subprocesses on the
  // first /dashboard compile — long enough to hang Chrome and crash
  // VS Code on fd exhaustion. Keep Turbopack rooted at `web/` and let
  // it resolve `../shared/` through the standard parent-directory lookup.
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Keep the service worker script itself out of every cache layer so a
        // new deploy's SW is always fetched fresh (paired with
        // updateViaCache:'none' on registration). Service-Worker-Allowed lets
        // it claim the root scope.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type',            value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control',           value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed',  value: '/' },
        ],
      },
      {
        // Conservative, broadly-safe security headers for all routes.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
