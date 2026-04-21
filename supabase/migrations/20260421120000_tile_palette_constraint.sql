-- Commit 2: Lock primary_colour to the 24 canonical tile palette slugs.
-- Greenfield (no real businesses yet) so we can migrate aggressively.

-- Step 1: Convert any existing hex values to slugs, mapping the 7 seeded
-- hex values to their nearest palette equivalents.
UPDATE businesses SET primary_colour = CASE
  WHEN primary_colour ILIKE '#D4AF37' THEN 'gold'
  WHEN primary_colour ILIKE '#7C3AED' THEN 'violet'
  WHEN primary_colour ILIKE '#EC4899' THEN 'rose'
  WHEN primary_colour ILIKE '#10B981' THEN 'emerald'
  WHEN primary_colour ILIKE '#3B82F6' THEN 'azure'
  WHEN primary_colour ILIKE '#F59E0B' THEN 'amber'
  WHEN primary_colour ILIKE '#6B7280' THEN 'slate'
  ELSE primary_colour
END
WHERE primary_colour IS NOT NULL;

-- Step 2: Anything still not in the palette gets reset to gold.
UPDATE businesses SET primary_colour = 'gold'
WHERE primary_colour IS NOT NULL
  AND primary_colour NOT IN (
    'gold','amber','ember','crimson','rose','orchid',
    'violet','indigo','azure','teal','emerald','fern',
    'bronze','walnut','terracotta','sage','eucalyptus','stone',
    'onyx','graphite','slate','linen','pearl','cream'
  );

-- Step 3: Set default for new businesses.
ALTER TABLE businesses
  ALTER COLUMN primary_colour SET DEFAULT 'gold';

-- Step 4: Add the CHECK constraint. NULL is still allowed (business hasn't
-- finished onboarding yet); any non-NULL value must be in the palette.
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_primary_colour_check;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_primary_colour_check
  CHECK (
    primary_colour IS NULL OR primary_colour IN (
      'gold','amber','ember','crimson','rose','orchid',
      'violet','indigo','azure','teal','emerald','fern',
      'bronze','walnut','terracotta','sage','eucalyptus','stone',
      'onyx','graphite','slate','linen','pearl','cream'
    )
  );

-- Step 5: Add a logo_url column for the business's monochrome white logo
-- (auto-processed at upload time). Optional — if NULL, the Tile component
-- falls back to a serif monogram of the business name's first letter.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN businesses.primary_colour IS
  'Canonical tile colour slug. Must be one of the 24 values in the OpenBook tile palette (see lib/tile-palette.ts).';
COMMENT ON COLUMN businesses.logo_url IS
  'Pre-processed monochrome white logo for use on the business tile. Auto-generated at upload time.';
