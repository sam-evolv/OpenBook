-- Open Spots Phase 1 — migration 06
-- Audit log for Expo push deliveries; powers the per-customer rolling rate caps.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE TABLE push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind text NOT NULL,
  sale_id uuid REFERENCES flash_sales(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered boolean,
  error text
);

CREATE INDEX push_log_customer_time_idx ON push_log (customer_id, sent_at DESC);

ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policy: writes happen via service role only.
