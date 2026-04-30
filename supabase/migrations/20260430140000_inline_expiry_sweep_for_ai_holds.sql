-- Replaces the Vercel cron path for hold expiry, which the Hobby plan
-- rejects at deploy validation (max 1/day cron). Inline the sweep into
-- the read- and write-side AI functions so any availability check or
-- new hold attempt first expires stale awaiting_payment rows.
--
-- The sweep is idempotent and the partial index bookings_active_holds_idx
-- (added in 20260430120000_ai_booking_assistant_data_layer.sql) keeps
-- the cost negligible — it only scans rows currently in awaiting_payment.
--
-- Function bodies below are pulled verbatim from production
-- (project nrntaowmmemhjfxjqjch) via pg_get_functiondef so this file
-- is genuinely re-runnable, not just a delta marker.

CREATE OR REPLACE FUNCTION public._sweep_expired_holds()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.bookings
     SET status = 'expired'
   WHERE status = 'awaiting_payment'
     AND hold_expires_at IS NOT NULL
     AND hold_expires_at < now();
$function$;

REVOKE ALL ON FUNCTION public._sweep_expired_holds() FROM public, anon, authenticated;

-- get_availability_for_ai — adds PERFORM public._sweep_expired_holds()
-- at the top of the body. Everything else is unchanged from
-- 20260430120000_ai_booking_assistant_data_layer.sql.
CREATE OR REPLACE FUNCTION public.get_availability_for_ai(p_business_id uuid, p_service_id uuid, p_date date)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tz             text := 'Europe/Dublin';
  v_dow            int  := EXTRACT(DOW FROM p_date)::int;
  v_duration_min   int;
  v_buffer_min     int;
  v_open_time      time;
  v_close_time     time;
  v_is_open        boolean;
  v_is_closed      boolean;
  v_now            timestamptz := now();
  v_has_schedules  boolean;
BEGIN
  -- Inline expiry sweep. Replaces the rejected Vercel cron route.
  PERFORM public._sweep_expired_holds();

  -- TODO: capacity-aware availability when services.capacity > 1

  SELECT s.duration_minutes
    INTO v_duration_min
    FROM public.services s
   WHERE s.id = p_service_id
     AND s.business_id = p_business_id
     AND s.is_active = true;

  IF v_duration_min IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(b.buffer_minutes, 0)
    INTO v_buffer_min
    FROM public.businesses b
   WHERE b.id = p_business_id;

  IF EXISTS (
    SELECT 1 FROM public.business_closures bc
     WHERE bc.business_id = p_business_id
       AND bc.date = p_date
  ) THEN
    RETURN;
  END IF;

  SELECT bh.is_open, bh.is_closed, bh.open_time, bh.close_time
    INTO v_is_open, v_is_closed, v_open_time, v_close_time
    FROM public.business_hours bh
   WHERE bh.business_id = p_business_id
     AND bh.day_of_week = v_dow
   LIMIT 1;

  IF v_open_time IS NULL OR v_close_time IS NULL
     OR coalesce(v_is_closed, false) = true
     OR coalesce(v_is_open, true) = false
  THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.service_schedules ss
     WHERE ss.service_id = p_service_id
       AND ss.day_of_week = v_dow
  ) INTO v_has_schedules;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      ((p_date::text || ' ' || v_open_time::text)::timestamp
        AT TIME ZONE v_tz) AS day_open,
      ((p_date::text || ' ' || v_close_time::text)::timestamp
        AT TIME ZONE v_tz) AS day_close
  ),
  candidates AS (
    SELECT
      ((p_date::text || ' ' || ss.start_time::text)::timestamp
        AT TIME ZONE v_tz) AS s
    FROM public.service_schedules ss
    WHERE v_has_schedules
      AND ss.service_id = p_service_id
      AND ss.day_of_week = v_dow

    UNION ALL

    SELECT gs AS s
    FROM bounds, generate_series(
      bounds.day_open,
      bounds.day_close - make_interval(mins => v_duration_min),
      interval '15 minutes'
    ) AS gs
    WHERE NOT v_has_schedules
  ),
  enriched AS (
    SELECT c.s AS slot_start,
           c.s + make_interval(mins => v_duration_min) AS slot_end
    FROM candidates c, bounds
    WHERE c.s >= bounds.day_open
      AND c.s + make_interval(mins => v_duration_min) <= bounds.day_close
      AND c.s > v_now
  )
  SELECT e.slot_start, e.slot_end
  FROM enriched e
  WHERE NOT EXISTS (
    SELECT 1
      FROM public.bookings bk
     WHERE bk.business_id = p_business_id
       AND bk.status IN ('pending','confirmed','awaiting_payment')
       AND bk.starts_at - make_interval(mins => v_buffer_min) < e.slot_end
       AND bk.ends_at   + make_interval(mins => v_buffer_min) > e.slot_start
  )
  ORDER BY e.slot_start;
END;
$function$;

-- hold_slot_for_ai — adds PERFORM public._sweep_expired_holds() after
-- the auth check, before the customer/service lookups.
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

  -- Inline expiry sweep. Replaces the rejected Vercel cron route.
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
    v_hold_expires := now() + interval '10 minutes';
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
