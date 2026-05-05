-- Extend the AI paid-booking hold from 10 to 30 minutes so it aligns
-- with Stripe's minimum Checkout Session expires_at (30 min). Without
-- this change a user who pays after minute 10 lands on a booking the
-- inline expiry sweep has already moved to status='expired', and the
-- webhook's guarded UPDATE no-ops — money taken, no booking.
--
-- Only the paid branch (price_cents > 0) is affected. The free branch
-- still inserts status='confirmed' with hold_expires_at=NULL, so the
-- free booking path is untouched.
--
-- Body verbatim from 20260430140000_inline_expiry_sweep_for_ai_holds.sql
-- with the single literal change `interval '10 minutes'` → `interval '30 minutes'`.

CREATE OR REPLACE FUNCTION public.hold_slot_for_ai(p_service_id uuid, p_slot_start timestamp with time zone)
 RETURNS TABLE(booking_id uuid, expires_at timestamp with time zone, requires_payment boolean, price_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid            uuid := auth.uid();
  v_customer_id    uuid;
  v_business_id    uuid;
  v_duration_min   int;
  v_price_cents    int;
  v_buffer_min     int;
  v_slot_end       timestamptz;
  v_status         text;
  v_hold_expires   timestamptz;
  v_booking_id     uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: not authenticated'
      USING ERRCODE = '42501';
  END IF;

  PERFORM public._sweep_expired_holds();

  SELECT c.id INTO v_customer_id
    FROM public.customers c
   WHERE c.user_id = v_uid;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: no customer record for user'
      USING ERRCODE = '42501';
  END IF;

  SELECT s.business_id, s.duration_minutes, s.price_cents
    INTO v_business_id, v_duration_min, v_price_cents
    FROM public.services s
   WHERE s.id = p_service_id
     AND s.is_active = true;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'service_not_available' USING ERRCODE = 'P0002';
  END IF;

  v_slot_end := p_slot_start + make_interval(mins => v_duration_min);

  SELECT coalesce(b.buffer_minutes, 0) INTO v_buffer_min
    FROM public.businesses b WHERE b.id = v_business_id;

  IF EXISTS (
    SELECT 1 FROM public.bookings bk
     WHERE bk.business_id = v_business_id
       AND bk.status IN ('pending','confirmed','awaiting_payment')
       AND bk.starts_at - make_interval(mins => v_buffer_min) < v_slot_end
       AND bk.ends_at   + make_interval(mins => v_buffer_min) > p_slot_start
  ) THEN
    RAISE EXCEPTION 'slot_unavailable' USING ERRCODE = 'P0001';
  END IF;

  IF v_price_cents > 0 THEN
    v_status := 'awaiting_payment';
    v_hold_expires := now() + interval '30 minutes';
  ELSE
    v_status := 'confirmed';
    v_hold_expires := NULL;
  END IF;

  INSERT INTO public.bookings (
    business_id, service_id, customer_id,
    starts_at, ends_at, status, price_cents, hold_expires_at, source
  )
  VALUES (
    v_business_id, p_service_id, v_customer_id,
    p_slot_start, v_slot_end, v_status, v_price_cents, v_hold_expires, 'ai'
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY
  SELECT v_booking_id,
         v_hold_expires,
         (v_price_cents > 0),
         v_price_cents;
END;
$function$;
