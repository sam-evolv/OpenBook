-- Open Spots PR 1, follow-up 09: align claim_flash_sale_spot with bookings constraints.
--
-- Three fixes from real-constraint discovery:
-- 1) source_assistant CHECK only allows chatgpt|claude|gemini|siri|other. That column is for AI-assistant
--    booking attribution (MCP/ChatGPT app), NOT for booking-channel attribution. Set to NULL; use `source`
--    column (free text, already writing 'open_spot') as the channel attribution surface.
-- 2) bookings_in_person_phone_required requires customer_phone when payment_mode='in_person'. Pull the
--    customer's phone from the customers table and write it through. If the customer has no phone and
--    they're trying an in_person claim, raise a clear error so the caller can prompt for one.
-- 3) Keep payment_mode in ('stripe_now','in_person') vocabulary alignment from migration 08.

CREATE OR REPLACE FUNCTION claim_flash_sale_spot(
  p_sale_id uuid,
  p_customer_id uuid,
  p_payment_mode text DEFAULT 'stripe_now'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale flash_sales%ROWTYPE;
  v_booking_id uuid;
  v_customer_phone text;
BEGIN
  IF p_payment_mode NOT IN ('stripe_now', 'in_person') THEN
    RAISE EXCEPTION 'invalid_payment_mode: %', p_payment_mode USING ERRCODE = '22023';
  END IF;

  SELECT phone INTO v_customer_phone FROM customers WHERE id = p_customer_id;

  IF p_payment_mode = 'in_person'
     AND (v_customer_phone IS NULL OR length(trim(v_customer_phone)) = 0) THEN
    RAISE EXCEPTION 'phone_required_for_in_person' USING ERRCODE = 'P0002';
  END IF;

  UPDATE flash_sales
     SET bookings_taken = bookings_taken + 1
   WHERE id = p_sale_id
     AND status = 'active'
     AND bookings_taken < max_bookings
     AND expires_at > now()
  RETURNING * INTO v_sale;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sold_out' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO bookings (
    business_id, service_id, customer_id, customer_phone, starts_at, ends_at,
    status, price_cents, flash_sale_id, source, payment_mode
  ) VALUES (
    v_sale.business_id, v_sale.service_id, p_customer_id, v_customer_phone,
    v_sale.slot_time,
    v_sale.slot_time + (v_sale.duration_minutes || ' minutes')::interval,
    CASE WHEN p_payment_mode = 'stripe_now' THEN 'awaiting_payment' ELSE 'confirmed' END,
    v_sale.sale_price_cents, v_sale.id, 'open_spot', p_payment_mode
  ) RETURNING id INTO v_booking_id;

  IF v_sale.bookings_taken >= v_sale.max_bookings THEN
    UPDATE flash_sales SET status = 'sold_out' WHERE id = v_sale.id;
  END IF;

  RETURN v_booking_id;
END;
$$;
