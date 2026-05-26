-- ============================================================
-- GoSwift — Initial Database Schema
-- Run once in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
-- One row per authenticated user. Created automatically on
-- first login; full_name is filled when the user completes
-- the onboarding sheet after OTP verification.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT        UNIQUE NOT NULL,
  full_name   TEXT,                         -- nullable; filled post-login
  role        TEXT        NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. ORDERS ───────────────────────────────────────────────
-- One row per confirmed delivery order.

CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Route
  pickup          TEXT          NOT NULL,
  dropoff         TEXT          NOT NULL,

  -- Package
  package_type    TEXT          NOT NULL DEFAULT 'parcel'
                                CHECK (package_type IN ('parcel', 'food', 'bulky')),
  weight          NUMERIC(6,2)  NOT NULL DEFAULT 0 CHECK (weight >= 0),
  note            TEXT,

  -- Pricing
  fare_amount     NUMERIC(12,2) NOT NULL CHECK (fare_amount > 0),

  -- Payment
  payment_method  TEXT          NOT NULL DEFAULT 'card'
                                CHECK (payment_method IN ('card', 'cash', 'transfer')),
  payment_status  TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (payment_status IN ('pending', 'paid', 'failed')),

  -- Lifecycle: confirmed → in_transit → delivered  |  → cancelled
  status          TEXT          NOT NULL DEFAULT 'confirmed'
                                CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── 3. PERFORMANCE INDEXES ──────────────────────────────────
-- Covers the most common query: "all orders for a user, newest first"
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC);

-- Fast profile lookup by phone (used during auth bridge)
CREATE INDEX IF NOT EXISTS profiles_phone_idx
  ON public.profiles (phone);

-- ── 4. AUTO-UPDATE updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────
-- Users can only read and write their own rows.
-- The service role (used by Supabase internals) bypasses RLS.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders   ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles: owner can select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: owner can insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner can update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Orders policies
CREATE POLICY "orders: owner can select"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders: owner can insert"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
