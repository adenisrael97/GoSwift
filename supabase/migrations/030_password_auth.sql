-- ============================================================
-- 030_password_auth
--
-- Switches authentication from phone-OTP to email/phone + password.
--
-- Auth identity model after this migration:
--   • auth.users.email      — canonical Supabase identity + password (bcrypt)
--   • profiles.email        — denormalised copy so phone-login can resolve
--                             phone → email server-side, and so RSC/admin
--                             reads avoid an auth.users round-trip
--   • profiles.phone        — still UNIQUE NOT NULL (delivery contact +
--                             the auth_session cookie keys off it)
--
-- The only schema change required is making profiles.email unique so an
-- email maps to exactly one account. phone uniqueness already exists
-- (migration 001). A PARTIAL unique index is used because email is
-- nullable on legacy rows — NULLs are excluded so historical OTP-only
-- accounts (which have no email) do not collide with each other.
--
-- Idempotent: safe to run repeatedly.
-- Run once in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Unique email (case-insensitive, NULLs excluded) ──────
-- lower() makes the constraint case-insensitive so Foo@x.com and
-- foo@x.com cannot both register. Partial (WHERE email IS NOT NULL)
-- so multiple legacy rows without an email remain valid.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

-- ── 2. PostgREST schema cache reload ────────────────────────
NOTIFY pgrst, 'reload schema';
