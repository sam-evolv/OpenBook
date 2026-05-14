-- ============================================================
-- OpenBook v6: Post-visit recap stamp
-- ============================================================
-- Adds a single nullable timestamp column to bookings so the
-- /api/internal/send-recap endpoint can mark each booking exactly
-- once after firing the recap notification, and so the consumer
-- /consumer-bookings page can surface a "Your visit to X" card for
-- bookings whose recap has fired.
--
-- The recap dispatch itself is queued via the existing
-- pending_reminders table (kind='recap_3h') and routed by the
-- pg_cron drain — see supabase/migrations/recap_01_drain_routes_recap.sql.
-- This column is purely the read-side hint for the in-app card.
--
-- Run manually in Supabase before merging the consumer PR that
-- depends on it (see PR description).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recap_sent_at timestamptz;
