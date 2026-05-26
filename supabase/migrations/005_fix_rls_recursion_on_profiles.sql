-- ============================================================
-- 005_fix_rls_recursion_on_profiles
--
-- Root cause: two policies on the "profiles" table contained
-- subqueries that themselves query "profiles", causing Postgres
-- to re-evaluate those same policies → infinite recursion.
--
-- Affected policies (from 004_harden_rls_policies):
--   1. profiles_owner_update — WITH CHECK queried profiles twice
--      to enforce role/phone immutability.
--   2. profiles_admin_select — USING clause queried profiles to
--      check whether the caller is an admin.
--
-- Fix: two SECURITY DEFINER helpers read the caller's profile
-- fields as the postgres superuser, bypassing RLS entirely.
-- The policies are then rewritten to call these helpers instead
-- of querying profiles inline.
-- ============================================================

-- ── Helper 1: caller's current role (bypasses RLS) ──────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── Helper 2: caller's current phone (bypasses RLS) ─────────
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;

-- ── Fix 1: profiles_owner_update ────────────────────────────
-- Old WITH CHECK queried profiles inside a profiles policy.
-- New version calls the SECURITY DEFINER helpers instead.
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;

CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role  = get_my_role()
    AND phone = get_my_phone()
  );

-- ── Fix 2: profiles_admin_select ────────────────────────────
-- Old USING clause queried profiles inside a profiles SELECT policy.
-- New version calls the SECURITY DEFINER helper instead.
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');
