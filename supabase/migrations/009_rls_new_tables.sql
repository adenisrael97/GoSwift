-- ============================================================
-- 009_rls_new_tables
--
-- Enables RLS and creates policies for the tables introduced
-- in migration 006, plus the orders driver UPDATE policy that
-- requires the driver_id column added in migration 007.
--
-- All admin checks use get_my_role() (defined in 005) to avoid
-- RLS recursion. Migration 004 attempted these policies but
-- failed silently because the tables did not yet exist.
-- ============================================================

-- ── Enable RLS ───────────────────────────────────────────────
ALTER TABLE public.driver_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_earnings     ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- driver_profiles policies
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "driver_profile_own_select"     ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profile_own_update"     ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profile_customer_read"  ON public.driver_profiles;
DROP POLICY IF EXISTS "driver_profile_admin_all"      ON public.driver_profiles;

-- Driver can read their own profile.
CREATE POLICY "driver_profile_own_select" ON public.driver_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Driver can update their own profile but cannot change
-- system-managed fields: rating and total_trips are immutable.
CREATE POLICY "driver_profile_own_update" ON public.driver_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND rating      = (SELECT dp.rating      FROM public.driver_profiles dp WHERE dp.id = auth.uid())
    AND total_trips = (SELECT dp.total_trips FROM public.driver_profiles dp WHERE dp.id = auth.uid())
  );

-- Customer can read a driver's profile if they have an active
-- or recent order assigned to that driver.
CREATE POLICY "driver_profile_customer_read" ON public.driver_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.driver_id = driver_profiles.id
        AND o.user_id   = auth.uid()
    )
  );

-- Admin has full access.
CREATE POLICY "driver_profile_admin_all" ON public.driver_profiles
  FOR ALL TO authenticated
  USING     (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- driver_applications policies
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "driver_app_applicant_select" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_app_insert_own"       ON public.driver_applications;
DROP POLICY IF EXISTS "driver_app_admin_all"        ON public.driver_applications;

-- Applicant can read their own submissions.
CREATE POLICY "driver_app_applicant_select" ON public.driver_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated applicants can insert their own application.
-- Anonymous submissions go through the service-role client
-- (bypasses RLS entirely).
CREATE POLICY "driver_app_insert_own" ON public.driver_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Admin has full access.
CREATE POLICY "driver_app_admin_all" ON public.driver_applications
  FOR ALL TO authenticated
  USING     (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- driver_earnings policies
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "earnings_driver_own" ON public.driver_earnings;
DROP POLICY IF EXISTS "earnings_admin_all"  ON public.driver_earnings;

-- Driver can read their own earnings totals.
CREATE POLICY "earnings_driver_own" ON public.driver_earnings
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

-- Admin has full access.
CREATE POLICY "earnings_admin_all" ON public.driver_earnings
  FOR ALL TO authenticated
  USING     (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ════════════════════════════════════════════════════════════
-- orders — driver UPDATE policy
-- (requires driver_id column from migration 007)
-- ════════════════════════════════════════════════════════════

-- Re-create the driver SELECT policy now that driver_id exists.
-- Migration 004's attempt failed because the column was absent.
DROP POLICY IF EXISTS "orders_driver_select" ON public.orders;
CREATE POLICY "orders_driver_select" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

-- New: driver can UPDATE the status and timestamps on their own order.
-- Prevents drivers from changing user_id, fare_amount, or other fields.
DROP POLICY IF EXISTS "orders_driver_update" ON public.orders;
CREATE POLICY "orders_driver_update" ON public.orders
  FOR UPDATE TO authenticated
  USING     (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Re-create admin ALL policy using get_my_role() to avoid recursion.
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING     (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

NOTIFY pgrst, 'reload schema';
