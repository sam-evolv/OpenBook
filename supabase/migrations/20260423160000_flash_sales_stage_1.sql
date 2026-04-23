-- Phase 4 PR 4.3 Flash Sales (Stage 1): schema for the flash-sale
-- workflow, opt-in consent trail, and booking attribution.

-- Applied note (2026-04-23): the first attempt in Studio rolled back
-- because flash_sales already has 4 more-precise policies in place
-- (separate INSERT/SELECT/UPDATE for business owners + a "Public can
-- view active flash sales" SELECT the consumer flow depends on).
-- This file now preserves those existing policies and only adds the
-- new flash_sale_notifications policy. No flash_sales DELETE policy
-- exists — drafts are soft-deleted via status='deleted' in the UI.

-- 1. flash_sale_notifications ------------------------------------
-- One row per (sale, recipient). Materialised at sale-create time
-- so the owner has a permanent ledger of intent even when the
-- Stage-1 dry-run skips the actual WhatsApp send.
--
-- status transitions:
--   queued  → sent | failed | blocked
-- block_reason is populated for blocked rows:
--   'no_opt_in'           — customer hasn't opted in
--   'stage_1_dry_run'     — Stage 1 sends zero messages by design
--   'outside_window'      — Stage 2: no template available and last
--                           inbound > 24h (no free-form path)
--   'rate_limited'        — Stage 2: sale cap reached for this tier
--   'stop_reply_received' — Stage 2: customer replied STOP
CREATE TABLE IF NOT EXISTS flash_sale_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES flash_sales(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  block_reason text,
  sent_at timestamptz,
  viewed_at timestamptz,
  booked_at timestamptz,
  booking_id uuid REFERENCES bookings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, customer_id)
);

CREATE INDEX IF NOT EXISTS flash_sale_notifications_sale_idx
  ON flash_sale_notifications (sale_id);
CREATE INDEX IF NOT EXISTS flash_sale_notifications_customer_idx
  ON flash_sale_notifications (customer_id);

-- 2. Opt-in consent on customer_businesses -----------------------
-- Per-business opt-in — a customer might say yes to Evolv and not
-- to another business they've also booked with. Source column is
-- the GDPR audit trail for HOW consent was captured.
--
-- Valid source values (enforced at application layer, not DB):
--   'booking_checkbox' — ticked the opt-in at consumer checkout
--   'reply_yes'        — replied YES to an opt-in request template
--   'owner_invited'    — owner pushed the opt-in invite (Stage 2)
ALTER TABLE customer_businesses
  ADD COLUMN IF NOT EXISTS promo_opt_in boolean NOT NULL DEFAULT false;

ALTER TABLE customer_businesses
  ADD COLUMN IF NOT EXISTS promo_opt_in_at timestamptz;

ALTER TABLE customer_businesses
  ADD COLUMN IF NOT EXISTS promo_opt_in_source text;

-- 3. Booking attribution -----------------------------------------
-- Nullable FK so a booking may or may not be tied to a flash sale.
-- Populated by the booking flow when the customer arrives via a
-- flash-sale link. Enables clean "sent → viewed → booked → revenue"
-- reporting on the Past Sales view.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS flash_sale_id uuid REFERENCES flash_sales(id);

CREATE INDEX IF NOT EXISTS bookings_flash_sale_idx
  ON bookings (flash_sale_id) WHERE flash_sale_id IS NOT NULL;

-- 4. RLS ---------------------------------------------------------
-- flash_sales already has RLS enabled with 4 policies (owner SELECT
-- / INSERT / UPDATE + public SELECT on active). We deliberately do
-- NOT overwrite those — see applied note above.
ALTER TABLE flash_sale_notifications ENABLE ROW LEVEL SECURITY;

-- flash_sale_notifications: owner ALL access via sale → business chain.
DROP POLICY IF EXISTS flash_sale_notifications_owner_all ON flash_sale_notifications;
CREATE POLICY flash_sale_notifications_owner_all
  ON flash_sale_notifications FOR ALL
  USING (
    sale_id IN (
      SELECT id FROM flash_sales WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    sale_id IN (
      SELECT id FROM flash_sales WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );
