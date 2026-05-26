-- ============================================================
-- 029_link_approved_driver
--
-- Enables the "apply first, login later" driver onboarding flow:
--
--   1. Anyone submits a driver application (user_id IS NULL).
--   2. Admin approves it.
--   3. Driver logs in via phone OTP for the first time.
--   4. verify-otp API calls link_approved_driver(phone, user_id).
--   5. This function atomically:
--        • links the application  → driver_applications.user_id = p_user_id
--        • promotes the profile   → profiles.role = 'driver'
--        • copies the name        → profiles.full_name (if not already set)
--        • creates driver_profiles row (vehicle details from application)
--        • creates driver_earnings row
--   6. verify-otp re-reads profiles.role → returns 'driver' to the client.
--   7. OtpForm redirects to /driver/dashboard.
--
-- The function is idempotent: if called twice for the same user
-- (e.g. duplicate request) the SELECT ... FOR UPDATE SKIP LOCKED
-- means only one caller proceeds; the second returns FALSE harmlessly.
--
-- Also enables Realtime on driver_applications so the admin dashboard
-- can receive INSERT events and show a live notification.
-- ============================================================

-- ── 1) link_approved_driver ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.link_approved_driver(
  p_phone   TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id        UUID;
  v_full_name     TEXT;
  v_vehicle_type  TEXT;
  v_vehicle_model TEXT;
  v_vehicle_color TEXT;
  v_plate_number  TEXT;
BEGIN
  -- Find the most recently approved application for this phone
  -- that has not been linked to an account yet.
  -- SKIP LOCKED prevents a duplicate login race from double-processing.
  SELECT id, full_name, vehicle_type, vehicle_model, vehicle_color, plate_number
    INTO v_app_id, v_full_name, v_vehicle_type, v_vehicle_model, v_vehicle_color, v_plate_number
    FROM public.driver_applications
   WHERE phone  = p_phone
     AND status = 'approved'
     AND user_id IS NULL
   ORDER BY reviewed_at DESC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Link the application row to this user account.
  UPDATE public.driver_applications
     SET user_id = p_user_id
   WHERE id = v_app_id;

  -- Promote the profile to driver. Copy the applicant's full name
  -- only if the profile name is not already set (new accounts start NULL).
  UPDATE public.profiles
     SET role      = 'driver',
         full_name = COALESCE(full_name, v_full_name),
         updated_at = now()
   WHERE id = p_user_id;

  -- Create (or refresh) the driver_profiles row with vehicle details.
  INSERT INTO public.driver_profiles (id, vehicle_type, vehicle_model, vehicle_color, plate_number)
  VALUES (p_user_id, v_vehicle_type, v_vehicle_model, v_vehicle_color, v_plate_number)
  ON CONFLICT (id) DO UPDATE
    SET vehicle_type  = EXCLUDED.vehicle_type,
        vehicle_model = EXCLUDED.vehicle_model,
        vehicle_color = EXCLUDED.vehicle_color,
        plate_number  = EXCLUDED.plate_number,
        updated_at    = now();

  -- Create the earnings row (idempotent).
  INSERT INTO public.driver_earnings (driver_id)
  VALUES (p_user_id)
  ON CONFLICT (driver_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- Only the service-role API client may call this.
GRANT EXECUTE ON FUNCTION public.link_approved_driver(TEXT, UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.link_approved_driver(TEXT, UUID)
  FROM PUBLIC, authenticated, anon;

-- ── 2) Enable Realtime on driver_applications ────────────────
--
-- The admin dashboard subscribes to INSERT events on this table
-- so it can show a live notification when a new application arrives.
-- The table must be in the supabase_realtime publication for this to work.

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_applications;

NOTIFY pgrst, 'reload schema';
