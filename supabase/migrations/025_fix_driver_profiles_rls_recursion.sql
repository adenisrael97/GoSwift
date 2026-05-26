-- ============================================================
-- 025_fix_driver_profiles_rls_recursion
--
-- The driver_profile_own_update policy guarded rating/total_trips
-- immutability through a WITH CHECK clause that re-read
-- driver_profiles:
--
--   WITH CHECK (
--     auth.uid() = id
--     AND rating       = (SELECT rating       FROM driver_profiles
--                          WHERE id = auth.uid())
--     AND total_trips  = (SELECT total_trips  FROM driver_profiles
--                          WHERE id = auth.uid())
--   )
--
-- Under combined RLS evaluation Postgres re-applies all permissive
-- policies on the inner SELECT, including driver_profile_customer_read
-- which joins to public.orders — whose own policies reference
-- driver_profiles back. The result is "infinite recursion detected
-- in policy for relation driver_profiles" on every PATCH /api/driver/*
-- that touches the table through the user-scoped client.
--
-- Fix: drop the recursive WITH CHECK and enforce column immutability
-- with column-level GRANTs instead. Authenticated users can only
-- UPDATE the four columns the driver app actually writes (current_lat,
-- current_lng, location_updated_at, is_online). Rating, total_trips,
-- vehicle metadata, and current_order_id remain writable only from
-- the service-role admin client (via SECURITY DEFINER RPCs).
-- ============================================================

DROP POLICY IF EXISTS "driver_profile_own_update" ON public.driver_profiles;

CREATE POLICY "driver_profile_own_update" ON public.driver_profiles
  FOR UPDATE TO authenticated
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Lock down what authenticated can write. service_role keeps full access
-- because all SECURITY DEFINER RPCs (accept_dispatch_offer, etc.) need it.
REVOKE UPDATE ON public.driver_profiles FROM authenticated;
GRANT  UPDATE (current_lat, current_lng, location_updated_at, is_online)
       ON public.driver_profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
