-- Phase 2 PR 1: persist on/off state of Settings automation toggles.
-- Shape is deliberately open (jsonb, default '{}') so we can rename, add,
-- or tier-gate individual toggles without schema churn. The eight keys
-- the dashboard-v2 Settings page writes today are:
--   auto_reviews, auto_waitlist_fill, auto_reminders, win_back_offers,
--   smart_rescheduling, low_stock_alerts, membership_renewal_nudges,
--   class_fill_notifications
--
-- Wiring each toggle to real automation logic is out of scope for this
-- PR. Phase 2 persists state only.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS automations jsonb NOT NULL DEFAULT '{}'::jsonb;
