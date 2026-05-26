-- driver_applications and driver_earnings both have a set_updated_at trigger
-- but are missing the updated_at column it writes to. The RPC
-- approve_driver_application() updates both tables, so both must have the column.
ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.driver_earnings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
