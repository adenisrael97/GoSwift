-- ============================================================
-- 034_security_perf_hardening
--
-- Addresses Supabase advisor findings (security + performance)
-- and enables customer → driver contact in one pass, because the
-- RLS consolidation and the contact feature touch the same set of
-- SELECT policies.
--
-- ── PERFORMANCE ──────────────────────────────────────────────
--  1. multiple_permissive_policies: every table carried a separate
--     admin `FOR ALL` policy that overlapped each role-specific
--     policy for the same (role, action). Postgres must evaluate
--     all permissive policies per row. We collapse each action to a
--     SINGLE permissive policy that ORs the admin and role checks.
--  2. auth_rls_initplan: bare auth.uid() in a policy is re-evaluated
--     per row. Wrapping it as (SELECT auth.uid()) lets the planner
--     evaluate it once per statement. Applied to every policy below.
--  3. unindexed_foreign_keys: add covering indexes on the four FKs
--     the advisor flagged.
--
-- ── SECURITY ─────────────────────────────────────────────────
--  4. anon/authenticated can EXECUTE cleanup_expired_idempotency_keys()
--     only because CREATE FUNCTION grants EXECUTE to PUBLIC by default.
--     It is a service-role maintenance sweep — revoke PUBLIC access.
--
--  NOTE on get_my_role(): the advisor also flags it as executable by
--  authenticated. That is REQUIRED — it is referenced inside the RLS
--  policies below, and Postgres checks EXECUTE on policy-referenced
--  functions against the querying role. Revoking it would break RLS
--  for every signed-in user. It only returns the caller's own role,
--  so exposure is harmless. Intentionally left executable.
--
--  NOTE on order_idempotency_keys (rls_enabled_no_policy): RLS is on
--  with no policy *by design* — migration 024 also REVOKEd all grants
--  from anon/authenticated, so the table is service-role only. The
--  INFO lint is expected and the table is fully locked down.
--
-- ── FEATURE: customer → driver contact ───────────────────────
--  The customer order-detail join (getMyOrder) embeds the driver's
--  profiles row (full_name, phone) to render the "call your driver"
--  card. Previously no profiles SELECT policy permitted a customer to
--  read their assigned driver's row, so the embed returned NULL and
--  the card never appeared. The consolidated profiles SELECT policy
--  below grants that read (mirrors the existing driver_profiles
--  customer-read rule): a customer may read a profile that is the
--  driver on one of their own orders.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- profiles
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

-- Owner, admin, or the customer of an order assigned to this driver.
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.driver_id = profiles.id
         AND o.user_id   = (SELECT auth.uid())
    )
  );

-- ════════════════════════════════════════════════════════════
-- orders
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
DROP POLICY IF EXISTS "orders_driver_select"   ON public.orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_driver_update"   ON public.orders;
DROP POLICY IF EXISTS "orders_admin_all"       ON public.orders;

-- SELECT: owner, assigned driver, or admin.
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.uid()) = driver_id
    OR get_my_role() = 'admin'
  );

-- INSERT: customer creating their own order in a safe initial state,
-- or admin. DB-level invariant preserved from migration 004.
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT auth.uid()) = user_id
      AND status      = 'confirmed'
      AND fare_amount > 0
    )
    OR get_my_role() = 'admin'
  );

-- UPDATE: assigned driver (status/timestamps) or admin.
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = driver_id
    OR get_my_role() = 'admin'
  )
  WITH CHECK (
    (SELECT auth.uid()) = driver_id
    OR get_my_role() = 'admin'
  );

-- DELETE: admin only (preserves the old FOR ALL delete capability).
CREATE POLICY "orders_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- driver_profiles
-- (column-level UPDATE grants from migration 025 remain in force)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "driver_profile_own_select"    ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profile_customer_read" ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profile_own_update"    ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profile_admin_all"     ON public.driver_profiles;

-- SELECT: own, the customer of an assigned order, or admin.
CREATE POLICY "driver_profiles_select" ON public.driver_profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.driver_id = driver_profiles.id
         AND o.user_id   = (SELECT auth.uid())
    )
  );

-- UPDATE: own row or admin. Column GRANTs (migration 025) restrict
-- authenticated to current_lat/current_lng/location_updated_at/is_online,
-- so rating/total_trips/etc. stay service-role only.
CREATE POLICY "driver_profiles_update" ON public.driver_profiles
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR get_my_role() = 'admin'
  )
  WITH CHECK (
    (SELECT auth.uid()) = id
    OR get_my_role() = 'admin'
  );

-- ════════════════════════════════════════════════════════════
-- dispatch_offers (SELECT-only for authenticated; writes via RPC)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "dispatch_offers_driver_select"   ON public.dispatch_offers;
DROP POLICY IF EXISTS "dispatch_offers_customer_select" ON public.dispatch_offers;
DROP POLICY IF EXISTS "dispatch_offers_admin_all"       ON public.dispatch_offers;

-- SELECT: the offered driver, the customer who owns the order, or admin.
CREATE POLICY "dispatch_offers_select" ON public.dispatch_offers
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = driver_id
    OR get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id      = dispatch_offers.order_id
         AND o.user_id = (SELECT auth.uid())
    )
  );

-- ════════════════════════════════════════════════════════════
-- driver_applications
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "driver_app_applicant_select" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_app_insert_own"       ON public.driver_applications;
DROP POLICY IF EXISTS "driver_app_admin_all"        ON public.driver_applications;

-- SELECT: applicant or admin.
CREATE POLICY "driver_applications_select" ON public.driver_applications
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR get_my_role() = 'admin'
  );

-- INSERT: applicant submitting their own pending application, or admin.
CREATE POLICY "driver_applications_insert" ON public.driver_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT auth.uid()) = user_id
      AND status = 'pending'
    )
    OR get_my_role() = 'admin'
  );

-- UPDATE: admin (review/approve). Real admin writes use the service-role
-- RPCs; this preserves the prior FOR ALL capability for the user-scoped
-- path and is the only UPDATE policy, so no overlap.
CREATE POLICY "driver_applications_admin_update" ON public.driver_applications
  FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- driver_earnings (SELECT-only for authenticated; writes via service role)
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "earnings_driver_own" ON public.driver_earnings;
DROP POLICY IF EXISTS "earnings_admin_all"  ON public.driver_earnings;

-- SELECT: the earning driver or admin.
CREATE POLICY "driver_earnings_select" ON public.driver_earnings
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = driver_id
    OR get_my_role() = 'admin'
  );

-- ════════════════════════════════════════════════════════════
-- Covering indexes for unindexed foreign keys
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS admin_settings_updated_by_idx
  ON public.admin_settings (updated_by);

CREATE INDEX IF NOT EXISTS driver_applications_reviewed_by_idx
  ON public.driver_applications (reviewed_by);

CREATE INDEX IF NOT EXISTS driver_earnings_order_id_idx
  ON public.driver_earnings (order_id);

CREATE INDEX IF NOT EXISTS order_idempotency_keys_order_id_idx
  ON public.order_idempotency_keys (order_id);

-- ════════════════════════════════════════════════════════════
-- Lock down the idempotency cleanup sweep (service-role only)
-- ════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_idempotency_keys()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
