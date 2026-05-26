-- ============================================================
-- 018_admin_assign_rpc
--
-- Closes a backend correctness gap in the admin order-assignment
-- flow. Before this migration, POST /api/admin/orders/:id/assign
-- only wrote orders.driver_id and orders.status. It did NOT:
--
--   • Set driver_profiles.current_order_id on the new driver
--     → the dispatcher kept treating them as free and could offer
--       them another order at the same time.
--
--   • Clear driver_profiles.current_order_id on the previous
--     driver during reassign → the prior driver stayed
--     "busy with this order" forever.
--
--   • Create a dispatch_offers audit row → realtime subscribers
--     (driver app, customer "looking for driver" UI) never saw
--     the assignment without a manual refresh.
--
-- This RPC fixes all three inside a single transaction. The API
-- route becomes a thin wrapper, exactly like the other dispatch
-- paths (accept, reject, find_and_offer).
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_assign_driver(
  p_order_id  UUID,
  p_driver_id UUID,
  p_admin_id  UUID
)
RETURNS TABLE (order_id UUID, status TEXT, driver_id UUID, previous_driver_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev_driver_id UUID;
  v_prev_status    TEXT;
  v_new_busy       UUID;
  v_now            TIMESTAMPTZ := now();
BEGIN
  -- 1. Lock the order so we have a consistent view across the steps below.
  SELECT o.driver_id, o.status
    INTO v_prev_driver_id, v_prev_status
    FROM public.orders o
   WHERE o.id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_prev_status NOT IN ('confirmed', 'processing') THEN
    -- Cannot assign to a delivered / cancelled / in_transit order from admin.
    RAISE EXCEPTION 'order_not_assignable' USING DETAIL = v_prev_status;
  END IF;

  -- 2. Validate the target driver exists and isn't already on a DIFFERENT order.
  --    Lock their row so we win against any concurrent dispatch attempt.
  SELECT dp.current_order_id
    INTO v_new_busy
    FROM public.driver_profiles dp
   WHERE dp.id = p_driver_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver_profile_not_found';
  END IF;

  IF v_new_busy IS NOT NULL AND v_new_busy <> p_order_id THEN
    RAISE EXCEPTION 'driver_already_busy' USING DETAIL = v_new_busy::TEXT;
  END IF;

  -- 3. Release the previous driver, if any, and if it's actually a different person.
  IF v_prev_driver_id IS NOT NULL AND v_prev_driver_id <> p_driver_id THEN
    UPDATE public.driver_profiles
       SET current_order_id = NULL
     WHERE id               = v_prev_driver_id
       AND current_order_id = p_order_id;
  END IF;

  -- 4. Assign the new driver on the order.
  UPDATE public.orders
     SET driver_id   = p_driver_id,
         status      = 'processing',
         accepted_at = COALESCE(accepted_at, v_now)
   WHERE id = p_order_id;

  -- 5. Mark the new driver busy.
  UPDATE public.driver_profiles
     SET current_order_id = p_order_id
   WHERE id = p_driver_id;

  -- 6. Cancel any live offers for this order so the realtime channel
  --    fires and the previous offerees see their card disappear.
  UPDATE public.dispatch_offers
     SET status       = 'expired',
         responded_at = v_now
   WHERE order_id = p_order_id
     AND status   = 'offered';

  -- 7. Audit row: a synthetic "accepted" offer so the assigned driver's
  --    realtime channel ticks (their offers subscription is filtered to
  --    driver_id = me, so this row reaches them) and so the dispatch
  --    history reflects what happened. Distance is left NULL because
  --    admin assignment is not driven by proximity.
  INSERT INTO public.dispatch_offers (
    order_id, driver_id, distance_km, expires_at, status, responded_at
  )
  VALUES (
    p_order_id, p_driver_id, NULL, v_now, 'accepted', v_now
  );

  RETURN QUERY
    SELECT p_order_id,
           'processing'::TEXT,
           p_driver_id,
           v_prev_driver_id;
END;
$$;

-- Service role only — admin routes call this, not the browser.
REVOKE EXECUTE ON FUNCTION public.admin_assign_driver(UUID, UUID, UUID)
  FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.admin_assign_driver(UUID, UUID, UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';
