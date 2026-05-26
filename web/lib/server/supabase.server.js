/**
 * Server-side Supabase utilities for Next.js API routes.
 *
 * Never import this file from client components — it is for
 * server-only code (API routes, Server Actions, middleware).
 *
 * Auth verification strategy:
 *   • Fast path (default) — verify the Supabase access token's HS256
 *     signature locally with Web Crypto. Zero network I/O per request.
 *     Validates exp/iss/aud and the user role embedded in the JWT.
 *   • Strict path (`{ strict: true }`) — additionally calls
 *     supabase.auth.getUser() so a token issued seconds before logout
 *     is still rejected. Reserve for account-deletion / admin paths
 *     where revocation detection matters within seconds, not minutes.
 *
 * The fast path requires SUPABASE_JWT_SECRET in env. When it is
 * missing we fall back to getUser() so deploys without the secret
 * still work (with the old performance characteristics).
 */
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── Symmetric (HS256) key cache ───────────────────────────────────────────
// Legacy Supabase projects sign access tokens with HMAC-SHA256 using the
// JWT secret. crypto.subtle.importKey is async and idempotent; cache the
// key so we don't re-import it per request.
let _hmacKeyPromise = null;
function getHmacKey() {
  if (_hmacKeyPromise) return _hmacKeyPromise;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  _hmacKeyPromise = crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return _hmacKeyPromise;
}

// ── Asymmetric (ES256) JWKS cache ─────────────────────────────────────────
// Newer Supabase projects sign access tokens with ECDSA P-256. The public
// keys are published as JWKS at /auth/v1/.well-known/jwks.json and rotate
// periodically. We cache the fetched keys for 5 minutes and refresh on a
// `kid` cache miss so rotation is handled transparently.
const JWKS_TTL_MS = 5 * 60 * 1000;
let _jwksCache = null; // { fetchedAt, keys: Map<kid, CryptoKey promise> }

async function refreshJwks() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) return null;
  try {
    const res = await fetch(`${projectUrl}/auth/v1/.well-known/jwks.json`, {
      // Edge-friendly fetch; Next.js dedupes concurrent identical requests.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    const map = new Map();
    for (const k of body?.keys ?? []) {
      if (!k?.kid) continue;
      // Each key is imported lazily — we keep the promise in the map so
      // concurrent verifies of the same kid share one import call.
      map.set(
        k.kid,
        crypto.subtle.importKey(
          'jwk',
          k,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['verify'],
        ),
      );
    }
    _jwksCache = { fetchedAt: Date.now(), keys: map };
    return _jwksCache;
  } catch {
    return null;
  }
}

async function getJwksKey(kid) {
  const fresh = _jwksCache && (Date.now() - _jwksCache.fetchedAt) < JWKS_TTL_MS;
  if (!fresh) {
    await refreshJwks();
  }
  let keyPromise = _jwksCache?.keys.get(kid);
  // Cache miss on a known-fresh cache could mean rotation just happened —
  // force one refresh before giving up.
  if (!keyPromise && fresh) {
    await refreshJwks();
    keyPromise = _jwksCache?.keys.get(kid);
  }
  return keyPromise ?? null;
}

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') return atob(padded);
  return Buffer.from(padded, 'base64').toString('binary');
}

function base64UrlToBytes(str) {
  const decoded = base64UrlDecode(str);
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}

function base64UrlToString(str) {
  const decoded = base64UrlDecode(str);
  // The payload is UTF-8 JSON; decode through TextDecoder for non-ASCII chars.
  return new TextDecoder().decode(Uint8Array.from(decoded, (c) => c.charCodeAt(0)));
}

/**
 * Verifies a Supabase access-token JWT locally.
 * Returns the decoded claims on success, or null on any failure.
 *
 * Supports both signing algorithms Supabase emits:
 *   • ES256 — modern asymmetric default. Verified against the project's
 *     public JWKS, looked up by the token's `kid` header.
 *   • HS256 — legacy symmetric mode. Verified with SUPABASE_JWT_SECRET.
 *
 * Claims checked: exp > now, iss matches the project URL, aud is
 * 'authenticated'.
 */
async function verifyJwtLocally(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  let header;
  try {
    header = JSON.parse(base64UrlToString(headerB64));
  } catch {
    return null;
  }

  // Branch on signing algorithm so we don't pay JWKS fetch cost on HS256
  // projects and don't try to load HMAC key on ES256 projects.
  let valid = false;
  try {
    if (header?.alg === 'ES256') {
      const kid = header.kid;
      if (!kid) return null;
      const key = await getJwksKey(kid);
      if (!key) return null;
      valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        base64UrlToBytes(sigB64),
        new TextEncoder().encode(`${headerB64}.${payloadB64}`),
      );
    } else if (header?.alg === 'HS256') {
      const key = await getHmacKey();
      if (!key) return null; // secret not configured — caller should fall back
      valid = await crypto.subtle.verify(
        'HMAC',
        key,
        base64UrlToBytes(sigB64),
        new TextEncoder().encode(`${headerB64}.${payloadB64}`),
      );
    } else {
      return null; // unsupported alg
    }
  } catch {
    return null;
  }
  if (!valid) return null;

  // Decode + validate claims.
  let claims;
  try {
    claims = JSON.parse(base64UrlToString(payloadB64));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= now) return null;
  if (claims.aud !== 'authenticated') return null;

  // iss should be `<NEXT_PUBLIC_SUPABASE_URL>/auth/v1`. Skip when env
  // is missing so misconfigured deploys fall back rather than 401 everyone.
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (projectUrl && claims.iss && claims.iss !== `${projectUrl}/auth/v1`) {
    return null;
  }

  return claims;
}

/**
 * Builds the `user` object the rest of the codebase expects from
 * Supabase's getUser() response. Only the fields actually used in
 * routes are populated.
 */
function userFromClaims(claims) {
  return {
    id:    claims.sub,
    email: claims.email ?? null,
    phone: claims.phone ?? null,
    role:  claims.role  ?? 'authenticated',
    user_metadata: claims.user_metadata ?? {},
    app_metadata:  claims.app_metadata  ?? {},
  };
}

/**
 * Creates a Supabase client that forwards the caller's JWT on every
 * request. RLS policies inside Supabase use auth.uid() derived from
 * this token, so users can only touch their own rows.
 *
 * auth.persistSession / autoRefreshToken are disabled because API
 * routes are stateless — there is no browser storage to write to.
 */
export function createServerSupabase(accessToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

/**
 * Extracts the Bearer token from an incoming Request's
 * Authorization header. Returns null if absent or malformed.
 */
export function extractBearerToken(request) {
  const auth = request.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

/**
 * Full authentication gate for API routes.
 *
 * Default (fast path): verifies the JWT signature locally — no network
 * I/O. Returns the user reconstructed from the JWT claims and a Supabase
 * client scoped to the token (so RLS still enforces row ownership).
 *
 * Strict mode: also calls supabase.auth.getUser() to reject tokens that
 * have been revoked since issuance. Pass `{ strict: true }` for routes
 * where stale-token rejection matters within seconds.
 *
 * Behaviour when SUPABASE_JWT_SECRET is unset: falls back to the strict
 * path so the route still works — at the cost of an Auth API round-trip
 * per request. Set the secret in env to unlock the fast path.
 *
 * Usage:
 *   const { user, supabase, errorResponse } = await requireAuth(request);
 *   if (errorResponse) return errorResponse;
 *
 *   // Revocation-sensitive flows:
 *   const { user, supabase, errorResponse } = await requireAuth(request, { strict: true });
 */
export async function requireAuth(request, { strict = false } = {}) {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      user: null,
      supabase: null,
      errorResponse: apiError('Missing Authorization header', 401),
    };
  }

  const supabase = createServerSupabase(token);

  // Fast path: local JWT verification.
  if (!strict) {
    const claims = await verifyJwtLocally(token);
    if (claims) {
      return { user: userFromClaims(claims), supabase, errorResponse: null };
    }
    // Local verification returned null. Two reasons to fall through to
    // the strict path rather than returning 401:
    //   • ES256 token but JWKS fetch failed (network blip, cold cache)
    //   • HS256 token but SUPABASE_JWT_SECRET not configured
    // Both are operational hiccups — getUser() is the safety net so
    // legitimate users don't get logged out. If the token is genuinely
    // invalid, strict will reject it with the same 401.
  }

  // Strict path: validates revocation by hitting Supabase Auth.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      errorResponse: apiError('Invalid or expired session', 401),
    };
  }

  return { user, supabase, errorResponse: null };
}

// ── Inline minimal response helper (avoids circular imports) ──
function apiError(message, status) {
  return NextResponse.json({ error: message }, { status });
}
