-- ============================================================
-- 014_dispatch_rpcs
--
-- All concurrency-sensitive dispatch logic lives in SECURITY
-- DEFINER functions on the database. The API routes are thin
-- wrappers — every invariant that matters (no double-booking,
-- no double-claim, atomic state transitions) is enforced inside
-- a single Postgres transaction.
--
-- Functions:
--   • haversine_km              — distance (km) between two coords
--   • find_and_offer_driver     — atomic dispatch of one order
--   • accept_dispatch_offer     — driver accepts; commits everything
--   • reject_dispatch_offer     — driver declines; caller re-dispatches
--   • expire_stale_offers       — TTL sweep (cron)
--   • complete_order            — clears driver busy + trip count
-- ============================================================

-- ── 1) haversine_km ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
AS $$
DECLARE
  r  CONSTANT NUMERIC := 6371;   -- Earth radius in km
  dlat NUMERIC;
  dlng NUMERIC;
  a    NUMERIC;
BEGIN
  IF lat1 IS NULL OR lat2 IS NULL OR lng1 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a    := sin(dlat / 2) ^ 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ^ 2;

  RETURN ROUND((r * 2 * asin(sqrt(a)))::numeric, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
  TO authenticated, service_role;

-- ── 2) find_and_offer_driver ─────────────────────────────────
--
-- Atomically picks the nearest free online driver and creates a
-- dispatch_offer row for them. Returns the offer details so the
-- caller (API route) can log it.
--
-- Returns an empty result set if no driver matches — the caller
-- decides what to do (retry later via cron, alert admin, etc.).
--
-- Race protection: FOR UPDATE SKIP LOCKED on the candidate driver
-- means two concurrent dispatch calls (e.g. two new orders coming
-- in at the same moment) cannot both pick the same driver. The
-- second call skips the locked row and picks the next one down.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_and_offer_driver(
  p_order_id        UUID,
  p_radius_km       NUMERIC DEFAULT 10,
  p_max_age_seconds INT     DEFAULT 300,   -- ignore drivers with stale location
  p_offer_ttl_sec   INT     DEFAULT 30
)
RETURNS TABLE (offer_id UUID, driver_id UUID, distance_km NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_lat NUMERIC;
  v_pickup_lng NUMERIC;
  v_status     TEXT;
  v_driver_id  UUID;
  v_distance   NUMERIC;
  v_offer_id   UUID;
BEGIN
  -- Lock the order row so we have a consistent view while dispatching.
  SELECT o.pickup_lat, o.pickup_lng, o.status
    INTO v_pickup_lat, v_pickup_lng, v_status
    FROM public.orders o
   WHERE o.id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Already claimed or terminal — nothing to dispatch.
  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'order_not_dispatchable' USING DETAIL = v_status;
  END IF;

  IF v_pickup_lat IS NULL OR v_pickup_lng IS NULL THEN
    RAISE EXCEPTION 'order_missing_pickup_coords';
  END IF;

  -- Pick the nearest candidate driver and lock them.
  --   • Online + free + with fresh location
  --   • Not already offered this order (any status)
  --   • Within p_radius_km of pickup
  -- Locked with SKIP LOCKED so concurrent dispatchers don't collide.
  WITH candidate AS (
    SELECT dp.id,
           haversine_km(v_pickup_lat, v_pickup_lng, dp.current_lat, dp.current_lng) AS dist
      FROM public.driver_profiles dp
     WHERE dp.is_online            = true
       AND dp.current_order_id     IS NULL
       AND dp.current_lat          IS NOT NULL
       AND dp.current_lng          IS NOT NULL
       AND dp.location_updated_at  > now() - (p_max_age_seconds || ' seconds')::interval
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
    -- No match. Bump attempts so the caller can decide when to stop.
    UPDATE public.orders
       SET dispatch_attempts = dispatch_attempts + 1
     WHERE id = p_order_id;
    RETURN;  -- empty result set
  END IF;

  -- Create the offer.
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

GRANT EXECUTE ON FUNCTION public.find_and_offer_driver(UUID, NUMERIC, INT, INT)
  TO service_role;

-- ── 3) accept_dispatch_offer ─────────────────────────────────
--
-- All-or-nothing acceptance. Either every write commits (offer
-- accepted, order assigned, driver busy, sibling offers cleaned
-- up) or nothing changes.
--
-- Idempotent: a second call after success returns 'offer_not_open'
-- with the existing state visible to the caller — the API route
-- treats both 'success' and 'order_already_claimed' as equivalent
-- so retries are safe.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(
  p_offer_id  UUID,
  p_driver_id UUID
)
RETURNS TABLE (order_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer    RECORD;
  v_order_id UUID;
  v_busy     UUID;
BEGIN
  -- Lock the offer.
  SELECT * INTO v_offer
    FROM public.dispatch_offers
   WHERE id = p_offer_id
   FOR UPDATE;

  IF NOT FOUND                  THEN RAISE EXCEPTION 'offer_not_found';   END IF;
  IF v_offer.driver_id <> p_driver_id THEN RAISE EXCEPTION 'offer_not_yours'; END IF;

  IF v_offer.status <> 'offered' THEN
    RAISE EXCEPTION 'offer_not_open' USING DETAIL = v_offer.status;
  END IF;

  IF v_offer.expires_at < now() THEN
    -- Treat a stale offer as expired and bail.
    UPDATE public.dispatch_offers
       SET status = 'expired', responded_at = now()
     WHERE id = p_offer_id;
    RAISE EXCEPTION 'offer_expired';
  END IF;

  -- Make sure the driver isn't already on a different order.
  SELECT current_order_id INTO v_busy
    FROM public.driver_profiles
   WHERE id = p_driver_id
   FOR UPDATE;

  IF v_busy IS NOT NULL THEN
    RAISE EXCEPTION 'driver_already_busy';
  END IF;

  -- Claim the order atomically. The compound WHERE makes this
  -- safe against a parallel admin assignment.
  UPDATE public.orders
     SET driver_id   = p_driver_id,
         status      = 'processing',
         accepted_at = now()
   WHERE id        = v_offer.order_id
     AND status    = 'confirmed'
     AND driver_id IS NULL
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    -- Someone else (admin? another offer? race?) already claimed it.
    UPDATE public.dispatch_offers
       SET status = 'expired', responded_at = now()
     WHERE id = p_offer_id;
    RAISE EXCEPTION 'order_already_claimed';
  END IF;

  -- Driver is now busy with this order.
  UPDATE public.driver_profiles
     SET current_order_id = v_order_id
   WHERE id = p_driver_id;

  -- Mark this offer accepted.
  UPDATE public.dispatch_offers
     SET status = 'accepted', responded_at = now()
   WHERE id = p_offer_id;

  -- Any other live offers for the same order are now stale.
  UPDATE public.dispatch_offers
     SET status = 'expired', responded_at = now()
   WHERE order_id = v_offer.order_id
     AND id       <> p_offer_id
     AND status   = 'offered';

  RETURN QUERY SELECT v_order_id, 'processing'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_dispatch_offer(UUID, UUID)
  TO service_role;

-- ── 4) reject_dispatch_offer ─────────────────────────────────
--
-- Driver actively declines. We just mark the offer rejected and
-- return the order_id so the caller can re-dispatch immediately
-- (instead of waiting for the cron sweep).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_dispatch_offer(
  p_offer_id  UUID,
  p_driver_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer RECORD;
BEGIN
  SELECT * INTO v_offer
    FROM public.dispatch_offers
   WHERE id = p_offer_id
   FOR UPDATE;

  IF NOT FOUND                         THEN RAISE EXCEPTION 'offer_not_found';   END IF;
  IF v_offer.driver_id <> p_driver_id  THEN RAISE EXCEPTION 'offer_not_yours';   END IF;

  -- Idempotent: if already responded, return the order_id without writing.
  IF v_offer.status <> 'offered' THEN
    RETURN v_offer.order_id;
  END IF;

  UPDATE public.dispatch_offers
     SET status = 'rejected', responded_at = now()
   WHERE id = p_offer_id;

  RETURN v_offer.order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_dispatch_offer(UUID, UUID)
  TO service_role;

-- ── 5) expire_stale_offers ───────────────────────────────────
--
-- Cron-callable sweep. Marks every offer whose TTL has elapsed
-- as 'expired' and returns the (offer_id, order_id) pairs so the
-- caller can re-dispatch each affected order.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_stale_offers()
RETURNS TABLE (offer_id UUID, order_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.dispatch_offers
     SET status       = 'expired',
         responded_at = now()
   WHERE status     = 'offered'
     AND expires_at < now()
  RETURNING id, order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_offers()
  TO service_role;

-- ── 6) complete_order ────────────────────────────────────────
--
-- Called when an order transitions to 'delivered' or 'cancelled'.
-- Clears the driver's busy flag and increments their trip count
-- on successful deliveries. Idempotent — only acts if the driver
-- is still attached to this order.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_order(
  p_order_id    UUID,
  p_driver_id   UUID,
  p_was_delivered BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.driver_profiles
     SET current_order_id = NULL,
         total_trips      = CASE WHEN p_was_delivered THEN total_trips + 1 ELSE total_trips END
   WHERE id               = p_driver_id
     AND current_order_id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_order(UUID, UUID, BOOLEAN)
  TO service_role;

NOTIFY pgrst, 'reload schema';
