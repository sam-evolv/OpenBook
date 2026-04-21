-- Phase 3 PR 3.3: owner notes on customer records.
--
-- Owner-entered text, not derivable from bookings — unlike status,
-- lifetime_value and cohort bucket, which Phase 3 computes server-side
-- per request (see docs/dashboard-v2-brief.md 2026-04-22 policy).

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS notes text;
