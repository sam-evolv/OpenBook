-- Track which subscription tier each business is on. Defaults to 'free'
-- so existing rows backfill cleanly. The Sidebar reads this to render
-- the plan label + Upgrade CTA. Real billing wiring lands later.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_plan_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_plan_check
  CHECK (plan IN ('free', 'pro', 'complete'));

COMMENT ON COLUMN public.businesses.plan IS
  'Subscription tier: free | pro | complete. Surfaced in the dashboard sidebar.';
