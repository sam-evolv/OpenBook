-- Standing alerts + reminders — migration 04
-- Tracks 24h / 2h booking-reminder pushes. Parallels flash_sale_notifications
-- but is keyed off booking_id rather than sale_id. The drain function in
-- migration 05 enqueues rows (Stage C) and delivers them (Stage D).
--
-- Backfill consideration: when the drain first runs, ~750 historical bookings
-- exist whose reminder window is in the past. Stage C clamps to
-- starts_at - 24h BETWEEN now()-15min AND now()+24h so past-due bookings
-- are never queued.

CREATE TABLE IF NOT EXISTS public.pending_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reminder_24h', 'reminder_2h')),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'dispatching', 'sent', 'failed', 'skipped')),
  block_reason text,
  sent_at timestamptz,
  error text,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, kind)
);

CREATE INDEX IF NOT EXISTS pending_reminders_drain_idx
  ON public.pending_reminders (status, scheduled_for)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS pending_reminders_booking_idx
  ON public.pending_reminders (booking_id);

ALTER TABLE public.pending_reminders ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policy. Writes happen via service role only,
-- through the pg_cron drain and /api/internal/send-reminder.
