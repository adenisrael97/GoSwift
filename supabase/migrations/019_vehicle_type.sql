-- ============================================================
-- 019_vehicle_type
--
-- Adds vehicle_type to the orders table so customers can
-- explicitly choose what vehicle they need for their delivery.
--
-- Allowed values: bike | tricycle | car | pickup | truck
--
-- Existing orders default to 'car' — no existing rows break.
-- driver_profiles.vehicle_type already exists as nullable TEXT;
-- the dispatch RPC (020) filters by it when set, falls back to
-- any-vehicle matching when NULL (backward compat for old drivers).
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'car'
  CHECK (vehicle_type IN ('bike', 'tricycle', 'car', 'pickup', 'truck'));

-- Partial index: speeds up dispatch queries that look for
-- confirmed orders of a specific vehicle type.
CREATE INDEX IF NOT EXISTS orders_vehicle_type_status_idx
  ON public.orders (vehicle_type, status)
  WHERE status = 'confirmed';

NOTIFY pgrst, 'reload schema';
