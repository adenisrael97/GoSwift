import { NextResponse } from "next/server";

/**
 * GET /api/version
 *
 * Reports the build identity of the deployment currently serving requests.
 * The client (components/pwa/ServiceWorkerRegister.js) compares this against
 * its own baked-in NEXT_PUBLIC_BUILD_ID; a mismatch means the client is
 * running stale code (a new deploy went out while an installed PWA kept the
 * old snapshot) and triggers a self-reload.
 *
 * Must never be cached — a cached answer would defeat the whole mechanism.
 * Kept deliberately dependency-free (no logger, no DB) so it cannot fail or
 * add latency to a check that runs on every app focus.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";

  return NextResponse.json(
    { buildId },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
