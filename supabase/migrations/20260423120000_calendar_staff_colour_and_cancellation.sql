-- Phase 3 PR 3.2: Calendar — multi-staff colour + cancellation provenance.
--
-- staff.colour: palette slug matching lib/tile-palette.ts. Until the Team
-- page (PR 3.3) ships a picker, Calendar falls back to a deterministic
-- hash of staff.id into a gold-safe subset of the palette.
--
-- bookings.cancelled_at / cancelled_by: we need to distinguish
-- customer-cancelled vs business-cancelled vs system-cancelled for
-- Phase 4 refund logic and no-show rate calculation. Stored as loose
-- text so the enum can evolve without another migration. Known values:
--   'customer' | 'business' | 'system'

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS colour text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text;
