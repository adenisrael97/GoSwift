-- ============================================================
-- 035 — Fix plpgsql variable_conflict in dispatch / order RPCs
-- ============================================================
--
-- Three SECURITY DEFINER functions declare OUT columns via
-- RETURNS TABLE(... order_id ..., ... status ...) and then reference
-- those same identifiers UNQUALIFIED inside their SQL statements
-- (e.g. `WHERE status = 'offered'`, `RETURNING id, order_id`).
--
-- PostgreSQL's default plpgsql setting is `variable_conflict = error`,
-- so every call raised:
--
--   42702: column reference "status" is ambiguous
--   42702: column reference "order_id" is ambiguous
--
-- ...meaning these functions failed on EVERY invocation, regardless of
-- data. Concretely, in production this meant:
--
--   • accept_dispatch_offer — drivers could never accept a dispatch
--     offer, so auto-assignment never completed.
--   • cancel_order          — customers/admins could never cancel.
--   • expire_stale_offers   — the cron offer-expiry / re-dispatch sweep
--     errored out.
--
-- The fix mirrors the idiom already used in 018_admin_assign_rpc.sql:
-- add `#variable_conflict use_column` so the ambiguous identifiers
-- resolve to the table column (which is what every reference here
-- intends — the OUT params are only ever populated positionally via
-- RETURN QUERY). No business logic changes; these are byte-for-byte the
-- deployed bodies with the single directive line added.
--
-- CREATE OR REPLACE preserves existing GRANTs, so no re-grant needed.
-- ============================================================

-- ── 1) accept_dispatch_offer ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(
  p_offer_id  UUID,
  p_driver_id UUID
)
RETURNS TABLE (order_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_offer    RECORD;
  v_order_id UUID;
  v_busy     UUID;
BEGIN
  SELECT * INTO v_offer
    FROM public.dispatch_offers
   WHERE id = p_offer_id
   FOR UPDATE;

  IF NOT FOUND                          THEN RAISE EXCEPTION 'offer_not_found';   END IF;
  IF v_offer.driver_id <> p_driver_id   THEN RAISE EXCEPTION 'offer_not_yours';   END IF;

  IF v_offer.status <> 'offered' THEN
    RAISE EXCEPTION 'offer_not_open' USING DETAIL = v_offer.status;
  END IF;

  IF v_offer.expires_at < now() THEN
    UPDATE public.dispatch_offers
       SET status = 'expired', responded_at = now()
     WHERE id = p_offer_id;
    RAISE EXCEPTION 'offer_expired';
  END IF;

  SELECT current_order_id INTO v_busy
    FROM public.driver_profiles
   WHERE id = p_driver_id
   FOR UPDATE;

  IF v_busy IS NOT NULL THEN
    RAISE EXCEPTION 'driver_already_busy';
  END IF;

  UPDATE public.orders
     SET driver_id   = p_driver_id,
         status      = 'processing',
         accepted_at = now()
   WHERE id        = v_offer.order_id
     AND status    = 'confirmed'
     AND driver_id IS NULL
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    UPDATE public.dispatch_offers
       SET status = 'expired', responded_at = now()
     WHERE id = p_offer_id;
    RAISE EXCEPTION 'order_already_claimed';
  END IF;

  UPDATE public.driver_profiles
     SET current_order_id = v_order_id
   WHERE id = p_driver_id;

  UPDATE public.dispatch_offers
     SET status = 'accepted', responded_at = now()
   WHERE id = p_offer_id;

  UPDATE public.dispatch_offers
     SET status = 'expired', responded_at = now()
   WHERE order_id = v_offer.order_id
     AND id       <> p_offer_id
     AND status   = 'offered';

  RETURN QUERY SELECT v_order_id, 'processing'::TEXT;
END;
$$;

-- ── 2) cancel_order ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id   UUID,
  p_actor_id   UUID,
  p_actor_role TEXT,
  p_reason     TEXT DEFAULT NULL
)
RETURNS TABLE (order_id UUID, status TEXT, previous_driver_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id    UUID;
  v_driver_id  UUID;
  v_status     TEXT;
BEGIN
  SELECT o.user_id, o.driver_id, o.status
    INTO v_user_id, v_driver_id, v_status
    FROM public.orders o
   WHERE o.id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF p_actor_role = 'customer' AND v_user_id <> p_actor_id THEN
    RAISE EXCEPTION 'not_order_owner';
  END IF;

  IF v_status NOT IN ('pending', 'confirmed', 'processing') THEN
    RAISE EXCEPTION 'too_late_to_cancel';
  END IF;

  IF v_driver_id IS NOT NULL THEN
    UPDATE public.driver_profiles
       SET current_order_id = NULL
     WHERE id               = v_driver_id
       AND current_order_id = p_order_id;
  END IF;

  UPDATE public.dispatch_offers
     SET status       = 'expired',
         responded_at = now()
   WHERE order_id = p_order_id
     AND status   = 'offered';

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

-- ── 3) expire_stale_offers ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_stale_offers()
RETURNS TABLE (offer_id UUID, order_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
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
