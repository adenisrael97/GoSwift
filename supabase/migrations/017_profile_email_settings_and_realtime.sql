-- ============================================================
-- 017_profile_email_settings_and_realtime
--
-- Closes three production-impacting gaps:
--
--   1. profiles.email — the column is read and written across the
--      app (api/profile, api/admin/users, driver/profile, driver/settings)
--      but no prior migration adds it. PATCH /api/profile and
--      GET /api/admin/users both 500 against any clean DB built from
--      migrations alone.
--
--   2. profiles.settings — JSONB blob persisted by PATCH /api/profile
--      and read by /driver/settings. Same missing-column failure mode.
--
--   3. supabase_realtime publication does not include public.orders,
--      so every realtime subscription on orders (customer dashboard,
--      customer orders list, admin live tile) silently fires zero
--      events. Only dispatch_offers (migration 013) was ever added.
--
-- All steps are idempotent (IF NOT EXISTS / pg_publication_tables
-- check) so this migration is safe to apply repeatedly and safe to
-- apply on top of databases that may already have these objects
-- created out-of-band.
-- ============================================================

-- ── 1. profiles.email ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Trim + length sanity (mirrors the 254-char cap in api/profile/route.js).
-- Null is allowed because phone is the primary identifier; email is opt-in.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_length_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_email_length_check
  CHECK (email IS NULL OR char_length(email) <= 254);

COMMENT ON COLUMN public.profiles.email IS
  'Optional contact email. Phone remains the primary identity. Editable from /profile/edit.';

-- ── 2. profiles.settings ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.settings IS
  'Per-user preferences blob (notifications, language, etc.) persisted via PATCH /api/profile.';

-- ── 3. Realtime publication: add public.orders ──────────────
-- Wrapped in pg_publication_tables check so the migration is
-- idempotent AND survives projects where the supabase_realtime
-- publication is managed automatically.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'orders'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
    END IF;
  END IF;
END
$$;

-- ── 4. PostgREST schema cache reload ────────────────────────
-- Forces the API layer to re-introspect immediately so the new
-- columns are visible without waiting for the next poll.
NOTIFY pgrst, 'reload schema';
