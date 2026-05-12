-- Push Platform — migration 02
-- Refactor match_standing_slots_to_sale to source push tokens from
-- push_device_tokens (PR 4a) rather than the deprecated customers.expo_push_token
-- column. Return signature gains a `platform` column (one row per active device).
-- Caller in PR 4b (standing-alert push dispatch) must update accordingly.
-- ALREADY APPLIED to project nrntaowmmemhjfxjqjch via Supabase MCP. This file is the
-- repo paper trail; do not re-apply.

-- Drop first: the return type changes (added platform, renamed expo_token →
-- push_token), so CREATE OR REPLACE alone errors with 42P13.
DROP FUNCTION IF EXISTS match_standing_slots_to_sale(uuid);

CREATE OR REPLACE FUNCTION match_standing_slots_to_sale(p_sale_id uuid)
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
  WHERE ss.active = true
    AND (ss.paused_until IS NULL OR ss.paused_until < now())
    AND (ss.category    IS NULL OR ss.category    = s.biz_category)
    AND (ss.business_id IS NULL OR ss.business_id = s.business_id)
    AND s.sale_price_cents <= ss.max_price_cents
    AND (ss.city IS NULL OR lower(ss.city) = lower(s.biz_city))
    AND ((ss.day_mask & (1 << EXTRACT(DOW FROM s.slot_time AT TIME ZONE 'Europe/Dublin')::int)) <> 0)
    AND (s.slot_time AT TIME ZONE 'Europe/Dublin')::time BETWEEN ss.time_start AND ss.time_end;
$$;
