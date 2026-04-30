-- =============================================================
-- AI booking assistant — data layer.
--
-- Adds the RPCs the AI tab will call (search, list services,
-- availability, hold, confirm, cancel-hold), the hold_expires_at
-- column + partial index, and the ai_tool_calls observability
-- table.
--
-- Notes on schema reconciliation (vs. the spec):
--   * bookings uses starts_at/ends_at — slot_start/slot_end in
--     the spec are surface-level names exposed by the RPC return
--     types only.
--   * services uses price_cents (integer).
--   * bookings.status is plain text (no CHECK, no enum) — adding
--     'expired' requires no DDL.
--   * business_closures is full-day (date column only). The
--     existing /api/availability route reads non-existent
--     start_date/end_date columns and is broken on closures —
--     this RPC matches the actual table.
--   * businesses.timezone does not exist; Europe/Dublin hardcoded.
--   * Existing /api/availability uses 15-minute candidate
--     intervals and excludes statuses ('pending','confirmed').
--     This RPC excludes ('pending','confirmed','awaiting_payment')
--     so AI-issued holds and any in-flight Stripe checkouts also
--     block the slot. buffer_minutes is honoured per the spec.
-- =============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_active_holds_idx
  ON public.bookings (starts_at)
  WHERE status = 'awaiting_payment';

CREATE TABLE IF NOT EXISTS public.ai_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  conversation_id text,
  tool_name text NOT NULL,
  args jsonb,
  result jsonb,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_tool_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_tool_calls_owner_read ON public.ai_tool_calls;
CREATE POLICY ai_tool_calls_owner_read
  ON public.ai_tool_calls
  FOR SELECT TO authenticated
  USING (customer_id = (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.search_businesses_for_ai(
  query_text text,
  category text DEFAULT NULL,
  location text DEFAULT NULL
)
RETURNS TABLE (
  business_id uuid,
  name text,
  slug text,
  category text,
  primary_colour text,
  address text,
  rating numeric,
  is_live boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      btrim(coalesce(query_text, '')) AS qtext,
      btrim(coalesce(category, ''))   AS qcat,
      btrim(coalesce(location, ''))   AS qloc
  )
  SELECT DISTINCT
    b.id, b.name, b.slug, b.category, b.primary_colour,
    b.address, b.rating, b.is_live
  FROM public.businesses b
  LEFT JOIN public.services s
    ON s.business_id = b.id
   AND s.is_active = true
  CROSS JOIN q
  WHERE b.is_live = true
    AND (
      q.qtext = ''
      OR to_tsvector('english',
           coalesce(b.name,'') || ' ' ||
           coalesce(b.description,'') || ' ' ||
           coalesce(s.name,'')
         ) @@ plainto_tsquery('english', q.qtext)
      OR b.name ILIKE '%' || q.qtext || '%'
      OR b.description ILIKE '%' || q.qtext || '%'
      OR s.name ILIKE '%' || q.qtext || '%'
    )
    AND (q.qcat = '' OR b.category ILIKE '%' || q.qcat || '%')
    AND (
      q.qloc = ''
      OR b.address ILIKE '%' || q.qloc || '%'
      OR b.city    ILIKE '%' || q.qloc || '%'
    )
  ORDER BY b.rating DESC NULLS LAST, b.name ASC
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.search_businesses_for_ai(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_businesses_for_ai(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_services_for_ai(p_business_id uuid)
RETURNS TABLE (
  service_id uuid,
  name text,
  duration_minutes integer,
  price_cents integer,
  capacity integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.duration_minutes, s.price_cents, s.capacity
  FROM public.services s
  WHERE s.business_id = p_business_id
    AND s.is_active = true
  ORDER BY s.sort_order NULLS LAST, s.name;
$$;

REVOKE ALL ON FUNCTION public.list_services_for_ai(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_services_for_ai(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_availability_for_ai(
  p_business_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS TABLE (
  slot_start timestamptz,
  slot_end   timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- TODO: capacity-aware availability when services.capacity > 1

  SELECT s.duration_minutes INTO v_duration_min
    FROM public.services s
   WHERE s.id = p_service_id
     AND s.business_id = p_business_id
     AND s.is_active = true;
  IF v_duration_min IS NULL THEN RETURN; END IF;

  SELECT coalesce(b.buffer_minutes, 0) INTO v_buffer_min
    FROM public.businesses b WHERE b.id = p_business_id;

  IF EXISTS (
    SELECT 1 FROM public.business_closures bc
     WHERE bc.business_id = p_business_id AND bc.date = p_date
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
     WHERE ss.service_id = p_service_id AND ss.day_of_week = v_dow
  ) INTO v_has_schedules;

  RETURN QUERY
  WITH bounds AS (
    SELECT
      ((p_date::text || ' ' || v_open_time::text)::timestamp AT TIME ZONE v_tz) AS day_open,
      ((p_date::text || ' ' || v_close_time::text)::timestamp AT TIME ZONE v_tz) AS day_close
  ),
  candidates AS (
    SELECT ((p_date::text || ' ' || ss.start_time::text)::timestamp AT TIME ZONE v_tz) AS s
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
    SELECT 1 FROM public.bookings bk
     WHERE bk.business_id = p_business_id
       AND bk.status IN ('pending','confirmed','awaiting_payment')
       AND bk.starts_at - make_interval(mins => v_buffer_min) < e.slot_end
       AND bk.ends_at   + make_interval(mins => v_buffer_min) > e.slot_start
  )
  ORDER BY e.slot_start;
END;
$$;

REVOKE ALL ON FUNCTION public.get_availability_for_ai(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_availability_for_ai(uuid, uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hold_slot_for_ai(
  p_service_id  uuid,
  p_slot_start  timestamptz
)
RETURNS TABLE (
  booking_id       uuid,
  expires_at       timestamptz,
  requires_payment boolean,
  price_cents      integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RAISE EXCEPTION 'insufficient_privilege: not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT c.id INTO v_customer_id FROM public.customers c WHERE c.user_id = v_uid;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: no customer record for user' USING ERRCODE = '42501';
  END IF;

  SELECT s.business_id, s.duration_minutes, s.price_cents
    INTO v_business_id, v_duration_min, v_price_cents
    FROM public.services s
   WHERE s.id = p_service_id AND s.is_active = true;
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
  SELECT v_booking_id, v_hold_expires, (v_price_cents > 0), v_price_cents;
END;
$$;

REVOKE ALL ON FUNCTION public.hold_slot_for_ai(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hold_slot_for_ai(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_booking_for_ai(
  p_booking_id uuid,
  p_stripe_payment_intent_id text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_customer_id  uuid;
  v_row          public.bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT c.id INTO v_customer_id FROM public.customers c WHERE c.user_id = v_uid;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: no customer record for user' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002'; END IF;

  IF v_row.customer_id IS DISTINCT FROM v_customer_id THEN
    RAISE EXCEPTION 'insufficient_privilege: not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_row.status IN ('expired','cancelled') THEN
    RAISE EXCEPTION 'booking_not_holdable' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.status = 'awaiting_payment' THEN
    IF p_stripe_payment_intent_id IS NULL THEN
      RAISE EXCEPTION 'stripe_payment_intent_required' USING ERRCODE = '22023';
    END IF;
    UPDATE public.bookings
       SET status = 'confirmed',
           stripe_payment_intent_id = p_stripe_payment_intent_id,
           hold_expires_at = NULL
     WHERE id = p_booking_id
     RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_for_ai(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_for_ai(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_hold_for_ai(p_booking_id uuid)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_customer_id  uuid;
  v_row          public.bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT c.id INTO v_customer_id FROM public.customers c WHERE c.user_id = v_uid;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: no customer record for user' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002'; END IF;

  IF v_row.customer_id IS DISTINCT FROM v_customer_id THEN
    RAISE EXCEPTION 'insufficient_privilege: not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_row.status = 'awaiting_payment' THEN
    UPDATE public.bookings
       SET status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = 'customer',
           hold_expires_at = NULL
     WHERE id = p_booking_id
     RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_hold_for_ai(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_hold_for_ai(uuid) TO authenticated;
