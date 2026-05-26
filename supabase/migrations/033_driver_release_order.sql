-- ============================================================
-- 033_driver_release_order
--
-- Enables a driver to release (un-accept) an order before
-- they mark it as picked up (status = 'processing' only).
--
-- When a driver releases:
--   1. Their busy flag is cleared (current_order_id → NULL)
--   2. Their dispatch_offer is marked 'released' — this is the
--      exclusion guard: find_and_offer_driver() skips any driver
--      who already has ANY offer row for the order, so the
--      releasing driver can never be re-offered the same order.
--   3. The order is reset to 'confirmed' (driver_id → NULL,
--      accepted_at → NULL, dispatch_attempts → 0) so the
--      API-layer re-dispatch gets a full 5-attempt budget again.
--   4. The caller immediately re-dispatches to the next nearest
--      available driver via dispatchOrder().
--
-- No release limit: drivers may release any number of times
-- across different orders. Analytics are captured via the
-- 'released' offer rows + release_reason column.
-- ============================================================

-- ── 1) Add 'released' to the status check on dispatch_offers ─
-- Drop and recreate the inline constraint (Postgres does not support
-- ALTER CONSTRAINT for CHECK constraints — full replace is required).
ALTER TABLE public.dispatch_offers
  DROP CONSTRAINT IF EXISTS dispatch_offers_status_check;

ALTER TABLE public.dispatch_offers
  ADD CONSTRAINT dispatch_offers_status_check
  CHECK (status IN ('offered', 'accepted', 'rejected', 'expired', 'released'));

-- ── 2) Audit column for the release reason ────────────────────
ALTER TABLE public.dispatch_offers
  ADD COLUMN IF NOT EXISTS release_reason TEXT;

-- ── 3) driver_release_order() ────────────────────────────────
CREATE OR REPLACE FUNCTION public.driver_release_order(
  p_order_id    UUID,
  p_driver_id   UUID,
  p_reason      TEXT DEFAULT NULL
)
RETURNS TABLE (order_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id  UUID;
  v_status     TEXT;
BEGIN
  -- Lock the order so no concurrent status advance (mark-picked-up) or
  -- admin reassignment races against this release.
  SELECT o.driver_id, o.status
    INTO v_driver_id, v_status
    FROM public.orders o
   WHERE o.id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Only the assigned driver may release their own order.
  IF v_driver_id IS DISTINCT FROM p_driver_id THEN
    RAISE EXCEPTION 'not_order_driver';
  END IF;

  -- Release is only allowed before the driver marks pickup. Once the
  -- package is in transit the customer is depending on delivery —
  -- at that point only admin can intervene.
  IF v_status = 'in_transit' OR v_status = 'delivered' THEN
    RAISE EXCEPTION 'too_late_to_release';
  END IF;

  IF v_status <> 'processing' THEN
    RAISE EXCEPTION 'order_not_releasable';
  END IF;

  -- ── 1. Clear driver busy flag ──────────────────────────────
  UPDATE public.driver_profiles
     SET current_order_id = NULL
   WHERE id               = p_driver_id
     AND current_order_id = p_order_id;

  -- ── 2. Mark the accepted offer as 'released' ───────────────
  -- Keeps the row so find_and_offer_driver() excludes this driver
  -- from future dispatch attempts on the same order automatically.
  -- release_reason is stored here for admin analytics.
  UPDATE public.dispatch_offers
     SET status         = 'released',
         release_reason = p_reason,
         responded_at   = now()
   WHERE order_id  = p_order_id
     AND driver_id = p_driver_id
     AND status    = 'accepted';

  -- ── 3. Reset the order ─────────────────────────────────────
  -- Back to 'confirmed' with a clean dispatch_attempts counter so the
  -- re-dispatch cycle gets a full 5-attempt budget. Previously-tried
  -- drivers (rejected/expired offers) are still excluded by the
  -- NOT EXISTS check in find_and_offer_driver(), not by this counter.
  UPDATE public.orders
     SET status            = 'confirmed',
         driver_id         = NULL,
         accepted_at       = NULL,
         dispatch_attempts = 0,
         updated_at        = now()
   WHERE id = p_order_id;

  RETURN QUERY
    SELECT p_order_id, 'confirmed'::TEXT;
END;
$$;

-- ── 4) Grants ─────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.driver_release_order(UUID, UUID, TEXT)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.driver_release_order(UUID, UUID, TEXT)
  FROM PUBLIC, authenticated, anon;

NOTIFY pgrst, 'reload schema';
