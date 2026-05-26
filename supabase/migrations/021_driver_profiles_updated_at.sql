-- Add the missing updated_at column to driver_profiles.
-- The approve_driver_application() RPC references this column in its
-- ON CONFLICT DO UPDATE clause, and a set_updated_at trigger fires
-- on INSERT/UPDATE. Without the column both paths raise
-- "record new has no field updated_at" and every approval fails.
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
