-- ============================================================
-- 008_grants_new_tables
--
-- Grants for the three tables created in migration 006.
-- service_role gets full access (used by admin API routes and
-- stored procedures). authenticated gets scoped access that
-- is then further constrained by RLS policies in migration 009.
-- ============================================================

-- ── driver_profiles ─────────────────────────────────────────
GRANT ALL    ON public.driver_profiles TO service_role;
GRANT SELECT, UPDATE ON public.driver_profiles TO authenticated;

-- ── driver_applications ─────────────────────────────────────
GRANT ALL    ON public.driver_applications TO service_role;
GRANT SELECT, INSERT ON public.driver_applications TO authenticated;

-- ── driver_earnings ─────────────────────────────────────────
GRANT ALL    ON public.driver_earnings TO service_role;
GRANT SELECT ON public.driver_earnings TO authenticated;

-- ── orders — add UPDATE for drivers ─────────────────────────
-- Drivers need to UPDATE status (processing→in_transit→delivered)
-- and the pickup_at / delivered_at timestamps on their own orders.
-- RLS policy orders_driver_update (migration 009) limits this to
-- rows where auth.uid() = driver_id.
GRANT UPDATE ON public.orders TO authenticated;

NOTIFY pgrst, 'reload schema';
