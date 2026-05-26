-- ============================================================
-- 004_harden_rls_policies
--
-- Fixes:
--  1. [CRITICAL] profiles UPDATE allowed self role-escalation via WITH CHECK
--  2. [HIGH]     driver_profiles FOR ALL let drivers tamper rating/total_trips
--  3. [MEDIUM]   All policies were bound to 'public' role instead of 'authenticated'
--  4. [MEDIUM]   Admin FOR ALL policies had no explicit WITH CHECK
--  5. [MEDIUM]   orders INSERT had no DB-level status/fare_amount invariant
--  6. [MEDIUM]   driver_applications INSERT had no status='pending' invariant
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_owner_select"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner_insert"  ON profiles;
DROP POLICY IF EXISTS "profiles_owner_update"  ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select"  ON profiles;

CREATE POLICY "profiles_owner_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_owner_insert" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- role and phone are immutable by the user; new value must match current stored value.
CREATE POLICY "profiles_owner_update" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role  = (SELECT p.role  FROM profiles p WHERE p.id = auth.uid())
    AND phone = (SELECT p.phone FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── orders ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "orders_customer_select" ON orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON orders;
DROP POLICY IF EXISTS "orders_driver_select"   ON orders;
DROP POLICY IF EXISTS "orders_admin_all"       ON orders;

CREATE POLICY "orders_customer_select" ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- DB enforces safe initial state on every customer-originated order.
CREATE POLICY "orders_customer_insert" ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status      = 'confirmed'
    AND fare_amount > 0
  );

CREATE POLICY "orders_driver_select" ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "orders_admin_all" ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── driver_profiles ───────────────────────────────────────────

DROP POLICY IF EXISTS "driver_profile_own_all"       ON driver_profiles;
DROP POLICY IF EXISTS "driver_profile_customer_read" ON driver_profiles;
DROP POLICY IF EXISTS "driver_profile_admin_all"     ON driver_profiles;

CREATE POLICY "driver_profile_own_select" ON driver_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- rating and total_trips are system-managed; new values must match current stored values.
CREATE POLICY "driver_profile_own_update" ON driver_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND rating      = (SELECT dp.rating      FROM driver_profiles dp WHERE dp.id = auth.uid())
    AND total_trips = (SELECT dp.total_trips FROM driver_profiles dp WHERE dp.id = auth.uid())
  );

CREATE POLICY "driver_profile_customer_read" ON driver_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.driver_id = driver_profiles.id
        AND o.user_id   = auth.uid()
    )
  );

CREATE POLICY "driver_profile_admin_all" ON driver_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── driver_applications ───────────────────────────────────────

DROP POLICY IF EXISTS "driver_app_applicant_select" ON driver_applications;
DROP POLICY IF EXISTS "driver_app_insert_own"       ON driver_applications;
DROP POLICY IF EXISTS "driver_app_admin_all"        ON driver_applications;

CREATE POLICY "driver_app_applicant_select" ON driver_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous submissions go through the service-role client (bypasses RLS).
-- This policy only covers authenticated applicants and enforces pending status.
CREATE POLICY "driver_app_insert_own" ON driver_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

CREATE POLICY "driver_app_admin_all" ON driver_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── driver_earnings ───────────────────────────────────────────

DROP POLICY IF EXISTS "earnings_driver_own" ON driver_earnings;
DROP POLICY IF EXISTS "earnings_admin_all"  ON driver_earnings;

CREATE POLICY "earnings_driver_own" ON driver_earnings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "earnings_admin_all" ON driver_earnings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
