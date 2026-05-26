-- ============================================================
-- 007_orders_driver_columns
--
-- Extends the orders table with columns required for the
-- driver dispatch pipeline:
--   • driver_id    — which driver owns this order
--   • accepted_at  — when driver accepted
--   • pickup_at    — when driver marked order as picked up
--   • delivered_at — when driver marked order as delivered
--   • eta          — estimated arrival (future: set by distance API)
--
-- Also widens the status CHECK constraint to include
-- 'processing' (order accepted by driver, en route to pickup).
-- ============================================================

-- ── Add dispatch columns ─────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eta          TIMESTAMPTZ;

-- ── Widen status constraint ──────────────────────────────────
-- Drop the existing check and recreate with 'processing' added.
-- 'processing' = driver accepted, heading to pickup address.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'cancelled'));

-- ── Performance indexes ──────────────────────────────────────

-- Fast lookup of all orders belonging to a specific driver.
CREATE INDEX IF NOT EXISTS orders_driver_id_idx
  ON public.orders (driver_id)
  WHERE driver_id IS NOT NULL;

-- Powers GET /api/driver/available-orders: confirmed + unassigned + newest first.
-- Partial index keeps it lean — only indexes the rows that matter.
CREATE INDEX IF NOT EXISTS orders_available_idx
  ON public.orders (created_at DESC)
  WHERE driver_id IS NULL AND status = 'confirmed';

NOTIFY pgrst, 'reload schema';
