-- ============================================================
-- Add Receiver/Sender Contact Fields to Orders
-- ============================================================
-- Enables drivers to contact sender at pickup and receiver at
-- dropoff, improving operational reliability and last-mile UX.
-- All columns nullable for backward compatibility.
--
-- Safe to apply live: no schema breaking changes, existing
-- app code continues to work (new fields optional in INSERT).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sender_phone   TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name  TEXT,
  ADD COLUMN IF NOT EXISTS receiver_phone TEXT;

-- Comment for clarity
COMMENT ON COLUMN public.orders.sender_phone   IS 'Phone number of the order placer (pickup contact)';
COMMENT ON COLUMN public.orders.receiver_name  IS 'Name of the delivery recipient';
COMMENT ON COLUMN public.orders.receiver_phone IS 'Phone number of the delivery recipient';
