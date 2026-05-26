-- ============================================================
-- 031_drop_otp_artifacts
--
-- Removes the now-dead OTP infrastructure left behind by the switch
-- to email/phone + password auth (migration 030). The application no
-- longer references any of these objects:
--
--   • lib/server/auth/otpStore.js        (deleted)
--   • lib/server/auth/authService.js     (deleted)
--   • lib/server/auth/mockOtpProvider.js (deleted)
--   • lib/server/rateLimiter.js          (deleted — was the only reader of otp_send_log)
--
-- Dropping them also clears five Supabase security advisories:
--   - rls_enabled_no_policy on otp_attempts, otp_send_log
--   - anon/authenticated SECURITY DEFINER executable on
--     increment_otp_attempts() and cleanup_expired_otp()
--
-- Idempotent (IF EXISTS). Neither table is a member of the
-- supabase_realtime publication, so no publication cleanup is needed.
-- Tables are dropped CASCADE to also remove their RLS policies and indexes.
-- ============================================================

-- Functions first (they read/write otp_attempts).
DROP FUNCTION IF EXISTS public.increment_otp_attempts(text);
DROP FUNCTION IF EXISTS public.cleanup_expired_otp();

-- Tables (CASCADE removes attached RLS policies + indexes).
DROP TABLE IF EXISTS public.otp_attempts CASCADE;
DROP TABLE IF EXISTS public.otp_send_log CASCADE;

NOTIFY pgrst, 'reload schema';
