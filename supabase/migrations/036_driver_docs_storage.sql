-- ============================================================
-- 036 — Private storage bucket for driver KYC documents
-- ============================================================
--
-- Driver applicants upload a license, NIN card, and vehicle
-- particulars/insurance. These are sensitive identity documents, so the
-- bucket is PRIVATE (public = false): objects are never world-readable.
--
-- Access model (matches CLAUDE.md "UI must not call Supabase directly"):
--   • Upload  — server only, via the service-role client in
--               POST /api/driver/documents. The applicant's JWT is
--               verified there; files land under {user_id}/...
--   • Read    — admins only, via short-lived signed URLs minted
--               server-side in GET /api/admin/applications/[id]/documents.
--
-- Because every access path uses the service-role client (which bypasses
-- RLS), no storage.objects policies are required — and the absence of any
-- public policy is exactly what keeps these documents private.
--
-- Limits: 5 MB per file; images + PDF only (mirrors the UI hint).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-docs',
  'driver-docs',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
