-- Standing alerts + reminders — migration 03
-- Extends match_standing_slots_to_sale to honour home_pins.notifications_enabled.
-- Cross-PR contract from PR 4a/4b: if the customer has pinned the business AND
-- explicitly toggled notifications off, suppress the match. Customers who have
-- NOT pinned the business pass through unchanged (no home_pin row -> no veto).

DROP FUNCTION IF EXISTS public.match_standing_slots_to_sale(uuid);

CREATE OR REPLACE FUNCTION public.match_standing_slots_to_sale(p_sale_id uuid)
RETURNS TABLE(customer_id uuid, push_token text, platform text)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  WITH sale AS (
    SELECT fs.*, b.city AS biz_city, b.category AS biz_category
    FROM flash_sales fs
    JOIN businesses b ON b.id = fs.business_id
    WHERE fs.id = p_sale_id
  )
  SELECT DISTINCT ON (ss.customer_id, pdt.token)
    ss.customer_id, pdt.token AS push_token, pdt.platform
  FROM standing_slots ss
  JOIN sale s ON true
  JOIN push_device_tokens pdt
    ON pdt.customer_id = ss.customer_id AND pdt.is_active = true
  LEFT JOIN home_pins hp
    ON hp.customer_id = ss.customer_id AND hp.business_id = s.business_id
  WHERE ss.active = true
    AND (ss.paused_until IS NULL OR ss.paused_until < now())
    AND (ss.category    IS NULL OR ss.category    = s.biz_category)
    AND (ss.business_id IS NULL OR ss.business_id = s.business_id)
    AND s.sale_price_cents <= ss.max_price_cents
    AND (ss.city IS NULL OR lower(ss.city) = lower(s.biz_city))
    AND ((ss.day_mask & (1 << EXTRACT(DOW FROM s.slot_time AT TIME ZONE 'Europe/Dublin')::int)) <> 0)
    AND (s.slot_time AT TIME ZONE 'Europe/Dublin')::time BETWEEN ss.time_start AND ss.time_end
    -- Pin veto: a home_pin row with notifications_enabled=false suppresses
    -- the match. NULL (no pin) passes through.
    AND (hp.notifications_enabled IS NULL OR hp.notifications_enabled = true);
$$;
