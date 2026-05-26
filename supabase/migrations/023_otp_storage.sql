-- ============================================================
-- 023_otp_storage
--
-- Replaces the in-process OTP store and rate limiter with
-- Postgres-backed tables. The in-memory Map fails the moment
-- the app runs on more than one Node.js instance (cold-started
-- serverless functions, horizontal scaling) — a user can request
-- an OTP on instance A and verify on instance B with no record.
--
-- Two tables:
--   • otp_attempts  — the live OTP for each phone (one row PK)
--   • otp_send_log  — append-only log of recent sends per phone,
--                     used by the rate limiter (30s cooldown +
--                     5/hour rolling cap)
--
-- Access is service-role only. The OTP send/verify routes use
-- getAdminSupabase() — these tables MUST NEVER be readable from
-- a user-scoped client (would leak codes).
-- ============================================================

-- ── 1. otp_attempts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_attempts (
  phone        TEXT         PRIMARY KEY,
  code         TEXT         NOT NULL,
  expires_at   TIMESTAMPTZ  NOT NULL,
  attempts     INT          NOT NULL DEFAULT 0
                            CHECK (attempts >= 0),
  used         BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_attempts_expires_at_idx
  ON public.otp_attempts (expires_at)
  WHERE used = false;

COMMENT ON TABLE  public.otp_attempts IS
  'Live OTP per phone. One row per phone, replaced on each send. Service-role only.';
COMMENT ON COLUMN public.otp_attempts.code IS
  'Plaintext OTP. Acceptable because rows are TTL-bounded (5 min), service-role only, and the SMS provider already saw the code. Switching to bcrypt is straightforward if threat model changes.';

-- ── 2. otp_send_log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_send_log (
  id        BIGSERIAL   PRIMARY KEY,
  phone     TEXT        NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_send_log_phone_sent_at_idx
  ON public.otp_send_log (phone, sent_at DESC);

COMMENT ON TABLE public.otp_send_log IS
  'Append-only send log for OTP rate limiting (30s cooldown, 5/hour cap).';

-- ── 3. RLS — both tables service-role only ──────────────────
-- Enabling RLS with no policies = nobody but service_role can touch
-- these. authenticated/anon get a hard "no rows" return.
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_send_log ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke any grants on authenticated/anon — defence in depth.
REVOKE ALL ON public.otp_attempts FROM authenticated, anon;
REVOKE ALL ON public.otp_send_log FROM authenticated, anon;
REVOKE ALL ON SEQUENCE public.otp_send_log_id_seq FROM authenticated, anon;

GRANT ALL ON public.otp_attempts TO service_role;
GRANT ALL ON public.otp_send_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.otp_send_log_id_seq TO service_role;

-- ── 4. House-keeping function (optional cron sweep) ─────────
-- Expired/used rows are harmless to keep but the table grows
-- without bound. A cron job can call this hourly to keep it tidy.
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempts_deleted INT;
  log_deleted      INT;
BEGIN
  DELETE FROM public.otp_attempts
   WHERE expires_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS attempts_deleted = ROW_COUNT;

  DELETE FROM public.otp_send_log
   WHERE sent_at < now() - INTERVAL '2 hours';
  GET DIAGNOSTICS log_deleted = ROW_COUNT;

  RETURN attempts_deleted + log_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_otp() TO service_role;

NOTIFY pgrst, 'reload schema';
