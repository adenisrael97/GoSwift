-- ============================================================
-- 020_vehicle_dispatch
--
-- Replaces find_and_offer_driver() with a vehicle-aware version.
--
-- Change: the candidate CTE now filters driver_profiles by
-- vehicle_type to match the order's required vehicle.
--
-- Backward-compat rule:
--   • driver_profiles.vehicle_type IS NULL  → driver can receive
--     any order (legacy drivers without type set by admin yet)
--   • driver_profiles.vehicle_type = order.vehicle_type → match
--   • anything else → skipped
--
-- All other logic (haversine distance, SKIP LOCKED race guard,
-- offer TTL, dispatch_attempts bump) is unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_and_offer_driver(
  p_order_id        UUID,
  p_radius_km       NUMERIC DEFAULT 10,
  p_max_age_seconds INT     DEFAULT 300,
  p_offer_ttl_sec   INT     DEFAULT 30
)
RETURNS TABLE (offer_id UUID, driver_id UUID, distance_km NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_lat        NUMERIC;
  v_pickup_lng        NUMERIC;
  v_status            TEXT;
  v_order_vehicle     TEXT;
  v_driver_id         UUID;
  v_distance          NUMERIC;
  v_offer_id          UUID;
BEGIN
  -- Lock the order row for a consistent view during dispatch.
  SELECT o.pickup_lat, o.pickup_lng, o.status, o.vehicle_type
    INTO v_pickup_lat, v_pickup_lng, v_status, v_order_vehicle
    FROM public.orders o
   WHERE o.id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'order_not_dispatchable' USING DETAIL = v_status;
  END IF;

  IF v_pickup_lat IS NULL OR v_pickup_lng IS NULL THEN
    RAISE EXCEPTION 'order_missing_pickup_coords';
  END IF;

  -- Pick the nearest candidate driver that:
  --   • is online and free with a fresh location
  --   • has NOT already been offered this order
  --   • is within p_radius_km of the pickup point
  --   • drives the vehicle type the order requires (or has no
  --     vehicle type set yet — legacy / admin-to-update drivers)
  WITH candidate AS (
    SELECT dp.id,
           haversine_km(v_pickup_lat, v_pickup_lng, dp.current_lat, dp.current_lng) AS dist
      FROM public.driver_profiles dp
     WHERE dp.is_online            = true
       AND dp.current_order_id     IS NULL
       AND dp.current_lat          IS NOT NULL
       AND dp.current_lng          IS NOT NULL
       AND dp.location_updated_at  > now() - (p_max_age_seconds || ' seconds')::interval
       AND (dp.vehicle_type = v_order_vehicle OR dp.vehicle_type IS NULL)
       AND NOT EXISTS (
         SELECT 1 FROM public.dispatch_offers o
          WHERE o.order_id  = p_order_id
            AND o.driver_id = dp.id
       )
  ),
  ranked AS (
    SELECT id, dist
      FROM candidate
     WHERE dist <= p_radius_km
     ORDER BY dist ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  SELECT id, dist
    INTO v_driver_id, v_distance
    FROM ranked;

  IF v_driver_id IS NULL THEN
    UPDATE public.orders
       SET dispatch_attempts = dispatch_attempts + 1
     WHERE id = p_order_id;
    RETURN;
  END IF;

  INSERT INTO public.dispatch_offers (
    order_id, driver_id, distance_km, expires_at, status
  )
  VALUES (
    p_order_id, v_driver_id, v_distance,
    now() + (p_offer_ttl_sec || ' seconds')::interval,
    'offered'
  )
  RETURNING id INTO v_offer_id;

  UPDATE public.orders
     SET dispatch_attempts = dispatch_attempts + 1
   WHERE id = p_order_id;

  RETURN QUERY SELECT v_offer_id, v_driver_id, v_distance;
END;
$$;

-- Revoke from public/authenticated — service_role grant already exists.
REVOKE EXECUTE ON FUNCTION public.find_and_offer_driver(UUID, NUMERIC, INT, INT) FROM PUBLIC, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.find_and_offer_driver(UUID, NUMERIC, INT, INT) TO service_role;

NOTIFY pgrst, 'reload schema';
