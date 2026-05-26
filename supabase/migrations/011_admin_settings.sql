-- ============================================================
-- 011_admin_settings
--
-- Singleton table for admin-configurable platform settings.
-- Uses a CHECK constraint (id = 1) to enforce exactly one row.
-- Seeded with sensible defaults; the admin dashboard reads and
-- writes this via GET/PATCH /api/admin/settings.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id          SMALLINT    PRIMARY KEY DEFAULT 1,
  settings    JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT admin_settings_singleton CHECK (id = 1)
);

-- Seed with default values (no-op if row already exists).
INSERT INTO public.admin_settings (id, settings)
VALUES (1, '{
  "business": {
    "companyName":    "GoSwift Logistics Ltd.",
    "supportEmail":   "support@goswift.ng",
    "supportPhone":   "+234 (0) 700 4673 100",
    "operatingHours": "24/7",
    "baseCity":       "Lagos"
  },
  "pricing": {
    "baseFare":         "500",
    "perKm":            "120",
    "serviceFee":       "150",
    "cancellationFee":  "200"
  },
  "notifications": {
    "newApplications":  true,
    "failedDeliveries": true,
    "weeklyReports":    true,
    "marketingEmails":  false
  }
}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write platform settings.
DROP POLICY IF EXISTS "admin_settings_admin_all" ON public.admin_settings;
CREATE POLICY "admin_settings_admin_all" ON public.admin_settings
  FOR ALL TO authenticated
  USING     (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

GRANT ALL    ON public.admin_settings TO service_role;
GRANT SELECT, UPDATE ON public.admin_settings TO authenticated;

NOTIFY pgrst, 'reload schema';
