-- ============================================================
-- Fix for PostgREST schema cache bug
-- ============================================================
-- Screenshot showed: "Could not find the 'end_at' column of
-- 'bookings' in the schema cache".
--
-- This happens when PostgREST caches the old schema. The reload
-- below tells it to refresh.
-- ============================================================

-- First make 100% sure end_at exists and is typed correctly
alter table bookings
  add column if not exists end_at timestamptz;

-- If any rows have a null end_at (legacy), backfill from start_at + duration
update bookings b
set end_at = b.start_at + make_interval(mins => coalesce(s.duration_minutes, 60))
from services s
where b.service_id = s.id
  and b.end_at is null;

-- Make it required going forward
alter table bookings
  alter column end_at set not null;

-- Tell PostgREST to reload the schema
notify pgrst, 'reload schema';
