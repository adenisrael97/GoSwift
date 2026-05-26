-- ── TABLE-LEVEL GRANTS ─────────────────────────────────────────────────────
-- RLS policies only run after the role clears table-level privileges.
-- Migrations run as the postgres superuser, but don't auto-grant to
-- service_role / authenticated — those must be explicit.

-- profiles: server-side admin ops (upsertProfile) use service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- orders: API routes run as authenticated (RLS filters by user_id)
GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT ON public.orders TO authenticated;

-- ── SCHEMA CACHE RELOAD ─────────────────────────────────────────────────────
-- Forces PostgREST to re-introspect the schema immediately so column
-- names like full_name are visible without waiting for the next poll.
NOTIFY pgrst, 'reload schema';
