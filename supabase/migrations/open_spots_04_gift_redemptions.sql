-- Open Spots Phase 1 — migration 04
-- Gifter buys a spot, recipient claims via token within 24h or gifter is refunded.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE TABLE gift_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  gifter_customer_id uuid NOT NULL REFERENCES customers(id),
  recipient_phone text NOT NULL,
  recipient_name text,
  claim_token text NOT NULL UNIQUE,
  claim_expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  claimed_by_customer_id uuid REFERENCES customers(id),
  gift_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gift_redemptions_token_idx  ON gift_redemptions (claim_token);
CREATE INDEX gift_redemptions_gifter_idx ON gift_redemptions (gifter_customer_id);

ALTER TABLE gift_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY gift_redemptions_gifter_read ON gift_redemptions
  FOR SELECT USING (
    gifter_customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );
