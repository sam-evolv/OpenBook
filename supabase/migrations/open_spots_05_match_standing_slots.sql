-- Open Spots Phase 1 — migration 05
-- Returns (customer_id, expo_token) for every standing_slot that matches a new flash_sale.
-- Case-insensitive city comparison; respects day_mask, time window, paused_until, price ceiling.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

CREATE OR REPLACE FUNCTION match_standing_slots_to_sale(p_sale_id uuid)
RETURNS TABLE(customer_id uuid, expo_token text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  WITH sale AS (
    SELECT fs.*, b.city AS biz_city, b.category AS biz_category
    FROM flash_sales fs
    JOIN businesses b ON b.id = fs.business_id
    WHERE fs.id = p_sale_id
  )
  SELECT ss.customer_id, c.expo_push_token
  FROM standing_slots ss
  JOIN sale s ON true
  JOIN customers c ON c.id = ss.customer_id
  WHERE ss.active = true
    AND (ss.paused_until IS NULL OR ss.paused_until < now())
    AND (ss.category    IS NULL OR ss.category    = s.biz_category)
    AND (ss.business_id IS NULL OR ss.business_id = s.business_id)
    AND s.sale_price_cents <= ss.max_price_cents
    AND (ss.city IS NULL OR lower(ss.city) = lower(s.biz_city))
    AND ((ss.day_mask & (1 << EXTRACT(DOW FROM s.slot_time AT TIME ZONE 'Europe/Dublin')::int)) <> 0)
    AND (s.slot_time AT TIME ZONE 'Europe/Dublin')::time BETWEEN ss.time_start AND ss.time_end
    AND c.expo_push_token IS NOT NULL;
$$;
