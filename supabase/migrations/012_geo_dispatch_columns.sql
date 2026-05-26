-- ============================================================
-- 012_geo_dispatch_columns
--
-- Adds the columns required for the auto-assign dispatch system:
--   • orders.pickup_lat / pickup_lng / dropoff_lat / dropoff_lng
--     (text addresses stay; we add coordinates alongside)
--   • orders.dispatch_attempts — how many drivers have been offered
--   • driver_profiles.current_lat / current_lng / location_updated_at
--     (last reported position from the driver app)
--   • driver_profiles.current_order_id — denormalised "busy" flag
--     (NULL = free; non-null = handling that order)
--
-- We deliberately do NOT enable PostGIS. Haversine in plpgsql is
-- adequate for MVP scale (≤ a few hundred online drivers per query)
-- and removes the operational cost of an extension. The radius
-- filter narrows the candidate set before distance ranking.
-- ============================================================

-- ── orders: pickup & dropoff coordinates ─────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_lat        NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS pickup_lng        NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS dropoff_lat       NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS dropoff_lng       NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS dispatch_attempts INT NOT NULL DEFAULT 0
                            CHECK (dispatch_attempts >= 0);

-- Sanity bounds on coordinates. NULL is allowed (legacy rows).
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pickup_coords_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_pickup_coords_check
  CHECK (
    (pickup_lat IS NULL AND pickup_lng IS NULL)
    OR (pickup_lat BETWEEN -90 AND 90 AND pickup_lng BETWEEN -180 AND 180)
  );

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_dropoff_coords_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_dropoff_coords_check
  CHECK (
    (dropoff_lat IS NULL AND dropoff_lng IS NULL)
    OR (dropoff_lat BETWEEN -90 AND 90 AND dropoff_lng BETWEEN -180 AND 180)
  );

-- ── driver_profiles: location + busy state ───────────────────
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS current_lat          NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS current_lng          NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS location_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_order_id     UUID
                            REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.driver_profiles DROP CONSTRAINT IF EXISTS driver_profiles_coords_check;
ALTER TABLE public.driver_profiles ADD CONSTRAINT driver_profiles_coords_check
  CHECK (
    (current_lat IS NULL AND current_lng IS NULL)
    OR (current_lat BETWEEN -90 AND 90 AND current_lng BETWEEN -180 AND 180)
  );

-- ── Indexes ──────────────────────────────────────────────────
-- Dispatch candidate set: drivers who are online AND free.
-- Partial index keeps this lean even when the driver pool grows.
DROP INDEX IF EXISTS public.driver_profiles_is_online_idx;
CREATE INDEX IF NOT EXISTS driver_profiles_dispatch_idx
  ON public.driver_profiles (location_updated_at DESC)
  WHERE is_online = true AND current_order_id IS NULL;

-- One driver can have at most one active order at a time.
-- Partial unique index lets us enforce that without preventing
-- NULLs (free drivers).
CREATE UNIQUE INDEX IF NOT EXISTS driver_profiles_current_order_uniq_idx
  ON public.driver_profiles (current_order_id)
  WHERE current_order_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
