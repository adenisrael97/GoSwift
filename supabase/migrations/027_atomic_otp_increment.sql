-- Atomic OTP attempt counter increment.
--
-- Replaces the two-query read-then-write in otpStore.js that had a
-- TOCTOU race: two concurrent verify requests could both read
-- attempts=2, both write attempts=3, and get a free extra guess.
--
-- A single UPDATE … RETURNING is atomic at the Postgres level — the
-- row is locked for the duration of the statement, so concurrent
-- callers serialise naturally.
--
-- Called by: lib/server/auth/otpStore.js via the service-role client.
-- Returns the NEW attempts value after incrementing, or zero rows if
-- the phone has no active OTP record.

CREATE OR REPLACE FUNCTION public.increment_otp_attempts(p_phone TEXT)
RETURNS TABLE (attempts INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.otp_attempts
  SET    attempts = attempts + 1
  WHERE  phone = p_phone
  RETURNING attempts;
$$;
