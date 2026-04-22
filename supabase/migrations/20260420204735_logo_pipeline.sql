-- ============================================================
-- OpenBook v4: Logo pipeline support
-- ============================================================

-- Add processed icon column — the App Store-quality auto-generated icon
alter table businesses
  add column if not exists processed_icon_url text;

comment on column businesses.processed_icon_url is
  'Auto-generated iOS-style app icon. Uploaded via /api/upload-logo which composes a squircle with the business logo centred on a gradient built from its dominant colour.';

-- Reload schema cache
notify pgrst, 'reload schema';

-- ============================================================
-- STORAGE BUCKETS — run these in the Supabase dashboard
-- ============================================================
--
-- Create two public buckets:
--   1. `logos` — raw uploaded logos
--   2. `icons` — processed iOS-style icons
--
-- In the Supabase dashboard:
--   Storage → New bucket → name: `logos`, Public: yes
--   Storage → New bucket → name: `icons`, Public: yes
--
-- Or via SQL (requires storage admin):
--   insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict do nothing;
--   insert into storage.buckets (id, name, public) values ('icons', 'icons', true) on conflict do nothing;
-- ============================================================
