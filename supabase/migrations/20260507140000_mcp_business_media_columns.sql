-- MCP server — Migration C
-- Adds the business_media table and the new columns on businesses and bookings
-- defined in docs/mcp-server-spec.md sections 8.7 and 8.8.
--
-- Defensive: bookings.source may already exist from earlier work. If it does,
-- we keep the existing column and extend its check constraint to include
-- 'mcp' alongside whatever values are currently allowed. If it doesn't, we
-- add it fresh with the spec's full ('web', 'whatsapp', 'mcp', 'dashboard')
-- check constraint.

-- 8.7 business_media
create table public.business_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  url text not null,
  caption text,
  kind text not null check (kind in ('interior', 'exterior', 'service', 'team')),
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index on public.business_media (business_id, sort_order);


-- 8.7 new columns on businesses
alter table public.businesses add column if not exists space_description text;
alter table public.businesses add column if not exists amenities text[];
alter table public.businesses add column if not exists accessibility_notes text;
alter table public.businesses add column if not exists parking_info text;
alter table public.businesses add column if not exists nearest_landmark text;
alter table public.businesses add column if not exists public_transport_info text;


-- 8.8 new columns on bookings
-- `source` may already exist from earlier work. Only add it fresh if missing;
-- otherwise widen the existing check constraint to include 'mcp'.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'source'
  ) then
    alter table public.bookings
      add column source text default 'web'
        check (source in ('web', 'whatsapp', 'mcp', 'dashboard'));
  else
    -- Column already exists. Find any check constraint touching `source`,
    -- and if it does not already allow 'mcp', drop it and re-add with 'mcp'
    -- appended to the existing IN list (preserving any other allowed values).
    declare
      v_name text;
      v_def  text;
    begin
      select con.conname, pg_get_constraintdef(con.oid)
        into v_name, v_def
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public'
        and cls.relname = 'bookings'
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%source%'
      limit 1;

      if v_name is not null and v_def not ilike '%''mcp''%' then
        execute format('alter table public.bookings drop constraint %I', v_name);
        v_def := regexp_replace(v_def, '\)\s*$', ", 'mcp')");
        execute format('alter table public.bookings add constraint %I %s', v_name, v_def);
      end if;
    end;
  end if;
end $$;

alter table public.bookings add column if not exists source_assistant text;
alter table public.bookings add column if not exists polling_token_hash text;
alter table public.bookings add column if not exists outcome text
  check (outcome in ('completed', 'no_show', 'cancelled', 'unknown'));

create index if not exists bookings_polling_token_hash_idx
  on public.bookings (polling_token_hash)
  where polling_token_hash is not null;


-- RLS for business_media
alter table public.business_media enable row level security;

create policy "Owners manage own media"
  on public.business_media for all
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Public read media for live businesses"
  on public.business_media for select
  using (
    business_id in (
      select id from public.businesses where is_live = true
    )
  );


-- ROLLBACK (manual, run if needed):
-- drop policy "Public read media for live businesses" on public.business_media;
-- drop policy "Owners manage own media" on public.business_media;
-- drop index if exists public.bookings_polling_token_hash_idx;
-- alter table public.bookings drop column if exists outcome;
-- alter table public.bookings drop column if exists polling_token_hash;
-- alter table public.bookings drop column if exists source_assistant;
-- (do NOT drop public.bookings.source — may exist from earlier work)
-- alter table public.businesses drop column if exists public_transport_info;
-- alter table public.businesses drop column if exists nearest_landmark;
-- alter table public.businesses drop column if exists parking_info;
-- alter table public.businesses drop column if exists accessibility_notes;
-- alter table public.businesses drop column if exists amenities;
-- alter table public.businesses drop column if exists space_description;
-- drop table public.business_media;
