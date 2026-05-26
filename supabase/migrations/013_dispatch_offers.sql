-- ============================================================
-- 013_dispatch_offers
--
-- The dispatch_offers table is the audit trail and realtime
-- vehicle for the auto-assign loop. Each row is a single offer
-- of one order to one driver:
--
--   • status = 'offered'  — live, awaiting driver response
--   • status = 'accepted' — driver took the order
--   • status = 'rejected' — driver actively declined
--   • status = 'expired'  — TTL passed; the cron will re-dispatch
--
-- Realtime: drivers subscribe with filter driver_id=eq.<me> so
-- each driver only receives offers addressed to them — not the
-- global firehose the old broadcast model produced.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dispatch_offers (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID         NOT NULL REFERENCES public.orders(id)   ON DELETE CASCADE,
  driver_id    UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status       TEXT         NOT NULL DEFAULT 'offered'
                            CHECK (status IN ('offered', 'accepted', 'rejected', 'expired')),

  -- Snapshot of the distance at offer time (for analytics / debug).
  distance_km  NUMERIC(6,2),

  expires_at   TIMESTAMPTZ  NOT NULL,
  responded_at TIMESTAMPTZ,

  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────

-- A driver should never receive two live offers for the same
-- order. Partial unique index makes this a DB invariant.
CREATE UNIQUE INDEX IF NOT EXISTS dispatch_offers_live_unique_idx
  ON public.dispatch_offers (order_id, driver_id)
  WHERE status = 'offered';

-- Driver's "what's offered to me right now" lookup + realtime payload filter.
CREATE INDEX IF NOT EXISTS dispatch_offers_driver_live_idx
  ON public.dispatch_offers (driver_id, expires_at)
  WHERE status = 'offered';

-- Order's offer history (for the dispatcher to skip drivers already tried).
CREATE INDEX IF NOT EXISTS dispatch_offers_order_history_idx
  ON public.dispatch_offers (order_id, created_at DESC);

-- Expiry sweep (cron).
CREATE INDEX IF NOT EXISTS dispatch_offers_expiry_idx
  ON public.dispatch_offers (expires_at)
  WHERE status = 'offered';

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;

-- Driver can read offers addressed to them. Writes go through
-- SECURITY DEFINER RPCs (no INSERT/UPDATE policy on purpose).
DROP POLICY IF EXISTS "dispatch_offers_driver_select" ON public.dispatch_offers;
CREATE POLICY "dispatch_offers_driver_select" ON public.dispatch_offers
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

-- Customer can see offers for their own order (handy for "looking
-- for a driver" UI in the user app).
DROP POLICY IF EXISTS "dispatch_offers_customer_select" ON public.dispatch_offers;
CREATE POLICY "dispatch_offers_customer_select" ON public.dispatch_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = dispatch_offers.order_id
         AND o.user_id = auth.uid()
    )
  );

-- Admin: full access.
DROP POLICY IF EXISTS "dispatch_offers_admin_all" ON public.dispatch_offers;
CREATE POLICY "dispatch_offers_admin_all" ON public.dispatch_offers
  FOR ALL TO authenticated
  USING     (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── Grants ───────────────────────────────────────────────────
GRANT ALL    ON public.dispatch_offers TO service_role;
GRANT SELECT ON public.dispatch_offers TO authenticated;

-- ── Realtime publication ─────────────────────────────────────
-- Idempotent: only add the table if it's not already in the publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'dispatch_offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_offers;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
