-- Open Spots Phase 1 — migration 01
-- Extends flash_sales with source, duration_minutes, listed_at + active/lookup indexes.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

ALTER TABLE flash_sales
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'planned'
    CHECK (source IN ('planned','cancellation_fill','weather_triggered')),
  ADD COLUMN IF NOT EXISTS duration_minutes int,
  ADD COLUMN IF NOT EXISTS listed_at timestamptz NOT NULL DEFAULT now();

UPDATE flash_sales fs
  SET duration_minutes = s.duration_minutes
  FROM services s
  WHERE fs.service_id = s.id AND fs.duration_minutes IS NULL;

UPDATE flash_sales SET duration_minutes = 60 WHERE duration_minutes IS NULL;

ALTER TABLE flash_sales ALTER COLUMN duration_minutes SET NOT NULL;

CREATE INDEX IF NOT EXISTS flash_sales_active_idx
  ON flash_sales (status, slot_time) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS flash_sales_city_lookup_idx
  ON flash_sales (business_id, status);
