-- Orphaned awaiting_payment holds were blocking availability indefinitely.
--
-- The sweep introduced in 20260430140000 only expires rows whose
-- hold_expires_at is set and in the past. But pre-AI booking paths
-- (app/api/booking/route.ts in particular) insert awaiting_payment
-- rows with hold_expires_at = NULL — those rows never become
-- "expired" and the get_availability_for_ai overlap check keeps
-- treating them as live for ever. Concrete fallout: Dublin Iron Gym
-- had a stale awaiting_payment booking from 2026-05-05 that
-- permanently masked the 7:30 PM slot, and the assistant kept
-- truthfully reporting the slot as unavailable.
--
-- Treat any awaiting_payment row older than an hour with no
-- hold_expires_at set as orphaned and sweep it. Legitimate live
-- holds always set hold_expires_at (hold_slot_for_ai does, the
-- Stripe checkout flow does), so the new branch only catches
-- abandoned legacy rows.
--
-- Function body is otherwise unchanged from
-- 20260430140000_inline_expiry_sweep_for_ai_holds.sql.

CREATE OR REPLACE FUNCTION public._sweep_expired_holds()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.bookings
     SET status = 'expired'
   WHERE status = 'awaiting_payment'
     AND (
       (hold_expires_at IS NOT NULL AND hold_expires_at < now())
       OR (hold_expires_at IS NULL  AND created_at < now() - interval '1 hour')
     );
$function$;

REVOKE ALL ON FUNCTION public._sweep_expired_holds() FROM public, anon, authenticated;

-- One-shot cleanup of the rows that are already orphaned at deploy
-- time. Subsequent get_availability_for_ai / hold_slot_for_ai calls
-- will keep the table tidy via the inline PERFORM in those RPCs.
SELECT public._sweep_expired_holds();
