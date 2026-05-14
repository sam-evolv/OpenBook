-- ============================================================
-- OpenBook v6: Post-visit recap notification timestamp
-- ============================================================
-- Adds a single nullable timestamp column to bookings so the
-- /api/cron/post-visit-recap drain can stamp each row exactly once
-- after firing the recap notification. The cron filters on
--   end_time within (now() - 3.25h, now() - 3h)
--   AND recap_sent_at IS NULL
-- so backfilling existing rows is intentionally NOT done — this
-- gates the recap to bookings that complete after the migration is
-- live, avoiding a thundering herd of notifications for historical
-- bookings the moment the cron runs.
--
-- Run manually in Supabase before merging the consumer PR that
-- depends on it (see PR description).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recap_sent_at timestamptz;

-- Partial index keeps the cron's hot query (rows that haven't been
-- recapped yet, ordered by end time) cheap as the bookings table
-- grows. The condition matches the cron's WHERE clause exactly so
-- Postgres can serve it as an index-only scan.
CREATE INDEX IF NOT EXISTS bookings_recap_pending_idx
  ON bookings (ends_at)
  WHERE recap_sent_at IS NULL AND status = 'confirmed';
