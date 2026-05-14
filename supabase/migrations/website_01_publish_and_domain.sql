-- ============================================================
-- OpenBook: marketing website publish + custom domain
-- ============================================================
-- Adds the three columns that gate the new [slug].openbook.ie
-- marketing route and reserve space for a future custom-domain UI.
--
--   website_is_published — owners toggle this in
--     /dashboard/website. The marketing route returns 404 when it
--     is false, unless the request carries ?preview=true and the
--     viewer is the business owner.
--
--   website_custom_domain — pointer for the future custom-domain
--     flow. The UI for owners to wire their own domain is deferred
--     to a follow-up PR. Partial unique index so multiple NULLs are
--     allowed but one domain can never map to two businesses.
--
--   website_headline — hero line on the marketing page, falls back
--     to business.name when null.
--
-- Run manually in Supabase before merging this PR. Sam to apply via
-- the Supabase MCP.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS website_is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_custom_domain text,
  ADD COLUMN IF NOT EXISTS website_headline text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_website_custom_domain
  ON businesses(website_custom_domain)
  WHERE website_custom_domain IS NOT NULL;
