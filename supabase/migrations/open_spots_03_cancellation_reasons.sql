-- Open Spots Phase 1 — migration 03
-- Captures why a consumer cancelled a booking (one reason per booking).
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE TABLE cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN
    ('schedule_conflict','price','changed_mind','found_alternative','illness','other')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX cancellation_reasons_business_idx ON cancellation_reasons (booking_id);

ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY cancellation_reasons_customer_insert ON cancellation_reasons
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY cancellation_reasons_owner_read ON cancellation_reasons
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN businesses bs ON bs.id = b.business_id
      WHERE bs.owner_id = auth.uid()
    )
  );
