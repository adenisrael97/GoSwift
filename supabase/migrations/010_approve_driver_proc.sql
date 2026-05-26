-- ============================================================
-- 010_approve_driver_proc
--
-- Creates the approve_driver_application() stored procedure
-- called by POST /api/admin/applications/[id]/review when
-- an admin approves a driver application.
--
-- The function is SECURITY DEFINER so it runs as the postgres
-- superuser and bypasses RLS — necessary because it writes to
-- profiles (owned by the applicant), driver_profiles, and
-- driver_earnings as a third party.
--
-- Atomicity: a FOR UPDATE lock on the application row prevents
-- two concurrent admin approvals of the same row.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_driver_application(
  p_application_id  UUID,
  p_reviewer_id     UUID,
  p_notes           TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_vtype       TEXT;
  v_vmodel      TEXT;
  v_vcolor      TEXT;
  v_plate       TEXT;
BEGIN
  -- Lock the row to prevent concurrent double-approvals.
  SELECT user_id, vehicle_type, vehicle_model, vehicle_color, plate_number
    INTO v_user_id, v_vtype, v_vmodel, v_vcolor, v_plate
    FROM public.driver_applications
   WHERE id = p_application_id AND status = 'pending'
     FOR UPDATE;

  -- The calling API route (applications/[id]/review/route.js) detects
  -- this specific string to return 404 vs 500.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  -- 1. Mark the application as approved.
  UPDATE public.driver_applications
     SET status       = 'approved',
         review_notes = p_notes,
         reviewed_by  = p_reviewer_id,
         reviewed_at  = now()
   WHERE id = p_application_id;

  -- Steps 2-4 only apply when the application is linked to an account.
  -- Anonymous applications (user_id IS NULL) remain in the approved state
  -- but no driver account is activated until the user creates an account
  -- and links it (future work).
  IF v_user_id IS NOT NULL THEN
    -- 2. Promote the profile role to 'driver'.
    UPDATE public.profiles
       SET role = 'driver'
     WHERE id = v_user_id;

    -- 3. Create (or update) the driver_profiles row.
    --    ON CONFLICT handles re-approval after a previous rejection.
    INSERT INTO public.driver_profiles (id, vehicle_type, vehicle_model, vehicle_color, plate_number)
    VALUES (v_user_id, v_vtype, v_vmodel, v_vcolor, v_plate)
    ON CONFLICT (id) DO UPDATE
      SET vehicle_type  = EXCLUDED.vehicle_type,
          vehicle_model = EXCLUDED.vehicle_model,
          vehicle_color = EXCLUDED.vehicle_color,
          plate_number  = EXCLUDED.plate_number,
          updated_at    = now();

    -- 4. Create the driver_earnings row (idempotent).
    INSERT INTO public.driver_earnings (driver_id)
    VALUES (v_user_id)
    ON CONFLICT (driver_id) DO NOTHING;
  END IF;
END;
$$;

-- Only the service-role API client should call this function.
GRANT EXECUTE ON FUNCTION public.approve_driver_application(UUID, UUID, TEXT) TO service_role;
