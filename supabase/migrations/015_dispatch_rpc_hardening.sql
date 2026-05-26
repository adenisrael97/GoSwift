-- ============================================================
-- 015_dispatch_rpc_hardening
--
-- Closes two security advisories on the migration-014 RPCs:
--
-- 1. Postgres grants EXECUTE on every new function to PUBLIC by
--    default. SECURITY DEFINER functions therefore become
--    callable by `anon` and `authenticated` over PostgREST
--    (/rest/v1/rpc/<name>) even when we only meant the service
--    role to invoke them. We revoke that.
--
-- 2. `haversine_km` was missing an explicit search_path. With
--    SECURITY DEFINER (or IMMUTABLE) functions that's a hijack
--    vector — we pin it to `public, pg_temp`.
-- ============================================================

-- ── haversine_km: pin search_path ─────────────────────────────
ALTER FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
  SET search_path = public, pg_temp;

-- ── Revoke PUBLIC + authenticated access on dispatch RPCs ────
-- service_role grants already exist (from migration 014); we
-- keep those. PUBLIC includes anon, so revoking from PUBLIC
-- and then explicitly from authenticated covers all REST users.

REVOKE EXECUTE ON FUNCTION public.find_and_offer_driver(UUID, NUMERIC, INT, INT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.accept_dispatch_offer(UUID, UUID)              FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.reject_dispatch_offer(UUID, UUID)              FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.expire_stale_offers()                          FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.complete_order(UUID, UUID, BOOLEAN)            FROM PUBLIC, authenticated, anon;

NOTIFY pgrst, 'reload schema';
