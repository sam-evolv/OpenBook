-- Open Spots Phase 1 — migration 07
-- Atomically claims a flash_sale spot and inserts the booking. Raises 'sold_out' if the
-- slot is full, expired, or no longer active. PR 3's /api/booking path will call this.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE OR REPLACE FUNCTION claim_flash_sale_spot(
  p_sale_id uuid,
  p_customer_id uuid,
  p_payment_mode text DEFAULT 'pay_now'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale flash_sales%ROWTYPE;
  v_booking_id uuid;
BEGIN
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
    business_id, service_id, customer_id, starts_at, ends_at,
    status, price_cents, flash_sale_id, source, payment_mode
  ) VALUES (
    v_sale.business_id, v_sale.service_id, p_customer_id,
    v_sale.slot_time,
    v_sale.slot_time + (v_sale.duration_minutes || ' minutes')::interval,
    CASE WHEN p_payment_mode = 'pay_now' THEN 'awaiting_payment' ELSE 'confirmed' END,
    v_sale.sale_price_cents, v_sale.id, 'open_spot', p_payment_mode
  ) RETURNING id INTO v_booking_id;

  IF v_sale.bookings_taken + 1 >= v_sale.max_bookings THEN
    UPDATE flash_sales SET status = 'sold_out' WHERE id = v_sale.id;
  END IF;

  RETURN v_booking_id;
END;
$$;
