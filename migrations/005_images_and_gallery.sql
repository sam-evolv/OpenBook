-- Migration 005 — Images & gallery
-- Adds columns for hero + gallery on businesses table
-- Creates storage buckets for hero + gallery with correct RLS

-- 1. Add columns to businesses
alter table businesses
  add column if not exists hero_image_url text,
  add column if not exists gallery_urls text[] default array[]::text[];

-- 2. Create storage buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('hero-images', 'hero-images', true),
  ('gallery-images', 'gallery-images', true)
on conflict (id) do update set public = true;

-- 3. Storage policies — mirror the logos/icons pattern
do $$
begin
  -- hero-images: auth upload, public read, service manage
  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Auth upload hero-images'
  ) then
    create policy "Auth upload hero-images"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'hero-images');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Public read hero-images'
  ) then
    create policy "Public read hero-images"
      on storage.objects for select
      to public
      using (bucket_id = 'hero-images');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Service role manage hero-images'
  ) then
    create policy "Service role manage hero-images"
      on storage.objects for all
      to service_role
      using (bucket_id = 'hero-images');
  end if;

  -- gallery-images: same trio
  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Auth upload gallery-images'
  ) then
    create policy "Auth upload gallery-images"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'gallery-images');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Public read gallery-images'
  ) then
    create policy "Public read gallery-images"
      on storage.objects for select
      to public
      using (bucket_id = 'gallery-images');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Service role manage gallery-images'
  ) then
    create policy "Service role manage gallery-images"
      on storage.objects for all
      to service_role
      using (bucket_id = 'gallery-images');
  end if;

  -- Allow auth users to delete their own images (for gallery removal)
  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Auth delete hero-images'
  ) then
    create policy "Auth delete hero-images"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'hero-images');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'objects'
    and schemaname = 'storage' and policyname = 'Auth delete gallery-images'
  ) then
    create policy "Auth delete gallery-images"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'gallery-images');
  end if;
end $$;

-- 4. Sanity check
select column_name, data_type
from information_schema.columns
where table_name = 'businesses'
  and column_name in ('hero_image_url', 'gallery_urls');
