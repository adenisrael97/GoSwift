-- ============================================================
-- 032_cancel_order_rpc
--
-- Implements cancel_order(), called by
-- POST /api/orders/[orderId]/cancel when a customer cancels
-- and by any future admin-cancel path (p_actor_role='admin').
--
-- The function is SECURITY DEFINER / service_role-only so the
-- three writes (driver release, offer expiry, order flip) happen
-- in one transaction with FOR UPDATE locking — no partial state.
--
-- Also adds cancelled_at and cancel_reason columns to orders so
-- admin analytics can see when and why orders were cancelled.
-- ============================================================

-- ── 1) Audit columns on orders ───────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason  TEXT;

-- ── 2) cancel_order() ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id    UUID,
  p_actor_id    UUID,
  p_actor_role  TEXT,           -- 'customer' or 'admin'
  p_reason      TEXT DEFAULT NULL
)
RETURNS TABLE (order_id UUID, status TEXT, previous_driver_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_driver_id  UUID;
  v_status     TEXT;
BEGIN
  -- Lock the row so no concurrent status flip (accept, status advance)
  -- races against this cancellation.
  SELECT o.user_id, o.driver_id, o.status
    INTO v_user_id, v_driver_id, v_status
    FROM public.orders o
   WHERE o.id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Customers may only cancel their own orders.
  -- Admins may cancel any order.
  IF p_actor_role = 'customer' AND v_user_id <> p_actor_id THEN
    RAISE EXCEPTION 'not_order_owner';
  END IF;

  -- Once a driver has picked up the package (in_transit) or the order
  -- is already terminal, cancellation is not allowed.
  IF v_status NOT IN ('pending', 'confirmed', 'processing') THEN
    RAISE EXCEPTION 'too_late_to_cancel';
  END IF;

  -- Release the assigned driver's busy flag so they immediately become
  -- available for the next dispatch cycle.
  IF v_driver_id IS NOT NULL THEN
    UPDATE public.driver_profiles
       SET current_order_id = NULL
     WHERE id               = v_driver_id
       AND current_order_id = p_order_id;  -- guard against stale denorm
  END IF;

  -- Expire any live offers for this order so the cron sweep and any
  -- in-flight driver app sessions stop showing them.
  UPDATE public.dispatch_offers
     SET status       = 'expired',
         responded_at = now()
   WHERE order_id = p_order_id
     AND status   = 'offered';

  -- Flip the order to cancelled with a full audit trail.
  UPDATE public.orders
     SET status        = 'cancelled',
         cancelled_at  = now(),
         cancel_reason = p_reason,
         updated_at    = now()
   WHERE id = p_order_id;

  RETURN QUERY
    SELECT p_order_id, 'cancelled'::TEXT, v_driver_id;
END;
$$;

-- ── 3) Grants ─────────────────────────────────────────────────
-- Only the service-role API client may call this function.
-- PostgreSQL grants EXECUTE to PUBLIC by default on new functions —
-- explicitly revoke so anon/authenticated cannot call it via PostgREST.
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, UUID, TEXT, TEXT)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, authenticated, anon;

-- Refresh PostgREST schema cache so the new function is discoverable
-- immediately without a container restart.
NOTIFY pgrst, 'reload schema';
