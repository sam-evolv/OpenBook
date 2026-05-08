-- Add updated_at columns + auto-touch triggers to the three tables whose
-- freshness feeds the ranker's RecencyScore (Section 6.2 of the spec).
--
-- Until this migration, RecencyScore was sourced from businesses.created_at
-- as a proxy (PR 111). With these columns + triggers the score now uses
-- max(business.updated_at, max(services.updated_at), max(business_hours.updated_at))
-- — the actual signal "did anyone touch this listing recently."
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE on the function,
-- DROP TRIGGER IF EXISTS before each CREATE TRIGGER. Safe to re-run.

alter table public.businesses
  add column if not exists updated_at timestamptz not null default now();
alter table public.services
  add column if not exists updated_at timestamptz not null default now();
alter table public.business_hours
  add column if not exists updated_at timestamptz not null default now();

-- Backfill from created_at where it exists. Only `businesses` has a
-- `created_at` column today; `services` and `business_hours` do not.
-- Re-run safety: only touch rows whose updated_at still looks like the
-- migration-time default (within 5 minutes of now AND older or equal to
-- created_at). Real edits via the trigger move updated_at past that
-- window, so a re-run is a no-op and won't stomp live data.
do $$
declare
  has_col boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'created_at'
  ) into has_col;
  if has_col then
    update public.businesses
       set updated_at = created_at
     where created_at is not null
       and updated_at >= now() - interval '5 minutes'
       and updated_at >= created_at;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'created_at'
  ) into has_col;
  if has_col then
    update public.services
       set updated_at = created_at
     where created_at is not null
       and updated_at >= now() - interval '5 minutes'
       and updated_at >= created_at;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'business_hours' and column_name = 'created_at'
  ) into has_col;
  if has_col then
    update public.business_hours
       set updated_at = created_at
     where created_at is not null
       and updated_at >= now() - interval '5 minutes'
       and updated_at >= created_at;
  end if;
end
$$;

-- Generic touch function. Extracted so we don't duplicate trigger bodies
-- across N tables. Pinned search_path for Postgres security best practice
-- (per the existing function pattern in 20260430140000).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_businesses on public.businesses;
create trigger set_updated_at_businesses
  before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_services on public.services;
create trigger set_updated_at_services
  before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_business_hours on public.business_hours;
create trigger set_updated_at_business_hours
  before update on public.business_hours
  for each row execute function public.set_updated_at();


-- ROLLBACK (manual, run if needed):
-- drop trigger if exists set_updated_at_businesses on public.businesses;
-- drop trigger if exists set_updated_at_services on public.services;
-- drop trigger if exists set_updated_at_business_hours on public.business_hours;
-- drop function if exists public.set_updated_at();
-- alter table public.businesses     drop column if exists updated_at;
-- alter table public.services       drop column if exists updated_at;
-- alter table public.business_hours drop column if exists updated_at;
