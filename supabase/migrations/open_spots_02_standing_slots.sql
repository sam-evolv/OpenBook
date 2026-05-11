-- Open Spots Phase 1 — migration 02
-- Creates standing_slots: a customer's persistent "ping me when X opens" alert.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE TABLE standing_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category text,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  max_price_cents int NOT NULL,
  day_mask smallint NOT NULL DEFAULT 127,
  time_start time NOT NULL DEFAULT '00:00',
  time_end   time NOT NULL DEFAULT '23:59',
  city text,
  radius_km int NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  matched_count int NOT NULL DEFAULT 0,
  paused_until timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX standing_slots_active_idx
  ON standing_slots (active, category, city) WHERE active = true;
CREATE INDEX standing_slots_customer_idx
  ON standing_slots (customer_id);

ALTER TABLE standing_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY standing_slots_owner_all ON standing_slots
  FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
