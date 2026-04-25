-- Resolve the schema/code drift on ai_insights.insight_type.
--
-- The CHECK constraint previously allowed only ('weekly','heatmap_callout'),
-- which describe how the insight was generated, not what category of insight
-- it is. The dashboard renderer (IntelligenceGrid, RecentInsights) expects
-- insight_type to be one of ('opportunity','warning','trend') — the
-- user-facing category — and falls back to a generic treatment otherwise.
--
-- Source-of-truth decision: insight_type is the user-facing category. A new
-- generated_by column captures the job-source classification.
--
-- Migration steps:
--   1. Add generated_by column (nullable, free-form text).
--   2. Backfill generated_by from insight_type for legacy rows where
--      insight_type encodes the source ('weekly','heatmap_callout').
--   3. Replace the CHECK constraint with the most permissive of the two
--      sets so existing seeded rows remain valid while new rows can use
--      the richer category labels.

ALTER TABLE ai_insights
  ADD COLUMN IF NOT EXISTS generated_by text;

UPDATE ai_insights
  SET generated_by = insight_type
  WHERE generated_by IS NULL
    AND insight_type IN ('weekly', 'heatmap_callout');

ALTER TABLE ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_insight_type_check;

ALTER TABLE ai_insights
  ADD CONSTRAINT ai_insights_insight_type_check
  CHECK (insight_type IN (
    'opportunity', 'warning', 'trend',
    'weekly', 'heatmap_callout'
  ));

COMMENT ON COLUMN ai_insights.insight_type IS
  'User-facing category surfaced in the dashboard. Prefer opportunity/warning/trend; weekly/heatmap_callout are retained for legacy rows seeded before the split.';

COMMENT ON COLUMN ai_insights.generated_by IS
  'Generation-job source (e.g. weekly, heatmap_callout). Independent from insight_type, which is the user-facing category.';
