-- ============================================================
-- 026_vehicle_pricing
--
-- Seed per-vehicle pricing into admin_settings.pricing.vehicles.
-- Each vehicle has its own baseFare + perKg, set by the admin via
-- /admin/settings. The OrderForm and checkout pages read this map
-- through the public GET /api/pricing endpoint.
--
-- Idempotent: only adds the "vehicles" object if it doesn't already
-- exist, leaves any admin-customised values alone.
-- ============================================================

UPDATE public.admin_settings
SET settings = jsonb_set(
  settings,
  '{pricing,vehicles}',
  '{
    "bike":     { "baseFare": 1500, "perKg": 90  },
    "tricycle": { "baseFare": 2200, "perKg": 110 },
    "car":      { "baseFare": 2500, "perKg": 120 },
    "pickup":   { "baseFare": 5000, "perKg": 80  },
    "truck":    { "baseFare": 9000, "perKg": 40  }
  }'::jsonb,
  true
),
updated_at = now()
WHERE id = 1
  AND (settings -> 'pricing' -> 'vehicles') IS NULL;

NOTIFY pgrst, 'reload schema';
