-- ============================================================
-- 006_driver_tables
--
-- Creates the three tables that the application code references
-- but that were never included in the initial schema:
--   • driver_profiles   — one row per approved driver user
--   • driver_applications — onboarding submissions (pre-approval)
--   • driver_earnings   — running financial totals per driver
--
-- All three use the handle_updated_at() trigger defined in 001.
-- RLS and grants are in migrations 008 and 009 respectively,
-- so that each concern has its own file.
-- ============================================================

-- ── driver_profiles ─────────────────────────────────────────
-- One row per approved driver (id mirrors profiles.id).
-- Created atomically by approve_driver_application() (migration 010).

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id             UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online      BOOLEAN      NOT NULL DEFAULT false,
  rating         NUMERIC(3,2) NOT NULL DEFAULT 5.0
                              CHECK (rating >= 0 AND rating <= 5),
  total_trips    INT          NOT NULL DEFAULT 0
                              CHECK (total_trips >= 0),
  vehicle_type   TEXT,
  vehicle_model  TEXT,
  vehicle_color  TEXT,
  plate_number   TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER set_driver_profiles_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS driver_profiles_is_online_idx
  ON public.driver_profiles (is_online)
  WHERE is_online = true;

-- ── driver_applications ─────────────────────────────────────
-- Driver onboarding submissions. user_id is nullable because
-- the /api/driver/apply endpoint accepts anonymous submissions;
-- a user_id is linked once the applicant signs up or logs in.

CREATE TABLE IF NOT EXISTS public.driver_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Personal information
  full_name        TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  email            TEXT,
  date_of_birth    DATE,
  gender           TEXT,
  nin              TEXT,
  address          TEXT,
  state            TEXT,

  -- Vehicle information
  vehicle_type     TEXT        NOT NULL,
  vehicle_model    TEXT,
  plate_number     TEXT        NOT NULL,
  manufacturer     TEXT,
  vehicle_color    TEXT,

  -- Guarantor
  guarantor_name   TEXT,
  guarantor_phone  TEXT,

  -- Document URLs (uploaded separately)
  license_url      TEXT,
  nin_doc_url      TEXT,
  particulars_url  TEXT,

  -- Review lifecycle
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes     TEXT,
  reviewed_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_driver_applications_updated_at
  BEFORE UPDATE ON public.driver_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Used by admin list endpoint: filter by status, newest first
CREATE INDEX IF NOT EXISTS driver_applications_status_idx
  ON public.driver_applications (status, submitted_at DESC);

-- Used to look up whether a user already has an application
CREATE INDEX IF NOT EXISTS driver_applications_user_id_idx
  ON public.driver_applications (user_id)
  WHERE user_id IS NOT NULL;

-- ── driver_earnings ─────────────────────────────────────────
-- Running financial totals per driver. One row per driver,
-- updated by the system after each completed delivery.
-- Historical payout records would live in a separate
-- driver_payouts table (future work).

CREATE TABLE IF NOT EXISTS public.driver_earnings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_earned     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  pending_payout   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (pending_payout >= 0),
  last_payout_date TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (driver_id)
);

CREATE TRIGGER set_driver_earnings_updated_at
  BEFORE UPDATE ON public.driver_earnings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
