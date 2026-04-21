-- Phase 3 PR 3.1: monthly revenue goal for the Overview page.
--
-- Nullable numeric — an unset goal is a legitimate state ("business
-- hasn't decided yet") distinct from 0 ("goal of nothing"). The goal
-- card's empty state keys off NULL to prompt the user to set one.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS monthly_revenue_goal numeric;
