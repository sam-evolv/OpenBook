-- ============================================================
-- OpenBook v5a: Onboarding + owner accounts
-- ============================================================

-- Owner profile — separate from customers, tied to Supabase auth.users
create table if not exists owners (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  onboarding_completed boolean default false,
  onboarding_step int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists owners_email_idx on owners (email);

-- Auto-create owner row on new auth user
create or replace function public.handle_new_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.owners (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_owner on auth.users;
create trigger on_auth_user_created_owner
  after insert on auth.users
  for each row execute procedure public.handle_new_owner();

-- Link business → owner
alter table businesses
  add column if not exists owner_id uuid references owners(id) on delete cascade;

create index if not exists businesses_owner_idx on businesses (owner_id);

-- Founder / business meta
alter table businesses
  add column if not exists founder_name text,
  add column if not exists founder_photo_url text,
  add column if not exists secondary_colour text,
  add column if not exists year_founded int;

-- Social handles — stored as jsonb so we can add/remove platforms without migrations
alter table businesses
  add column if not exists socials jsonb default '{}'::jsonb;
comment on column businesses.socials is
  'Object like { "instagram": "@evolvperformance", "tiktok": "...", "facebook": "...", "twitter": "..." }';

-- Instagram feed cache — we poll the Graph API on a schedule and store results here
create table if not exists instagram_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  post_id text not null,
  media_url text not null,
  thumbnail_url text,
  permalink text not null,
  caption text,
  posted_at timestamptz,
  fetched_at timestamptz default now(),
  unique (business_id, post_id)
);
create index if not exists insta_business_idx on instagram_posts (business_id, posted_at desc);

-- Instagram connection state per business
alter table businesses
  add column if not exists instagram_handle text,
  add column if not exists instagram_access_token text,
  add column if not exists instagram_connected_at timestamptz;

-- Stripe Connect state
alter table businesses
  add column if not exists stripe_charges_enabled boolean default false,
  add column if not exists stripe_onboarding_completed boolean default false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table owners enable row level security;
drop policy if exists owners_self_read on owners;
create policy owners_self_read on owners
  for select using (auth.uid() = id);
drop policy if exists owners_self_update on owners;
create policy owners_self_update on owners
  for update using (auth.uid() = id);

-- Business RLS: owner sees/writes their own businesses
drop policy if exists businesses_owner_all on businesses;
create policy businesses_owner_all on businesses
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Public read access for live businesses (consumer app uses service role bypass,
-- but this keeps the public API sensible)
drop policy if exists businesses_public_read on businesses;
create policy businesses_public_read on businesses
  for select
  using (is_live = true);

-- Services: owner can manage their own services
alter table services enable row level security;
drop policy if exists services_owner_all on services;
create policy services_owner_all on services
  for all
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
drop policy if exists services_public_read on services;
create policy services_public_read on services
  for select
  using (
    business_id in (select id from businesses where is_live = true)
    and is_active = true
  );

-- Bookings: owner sees bookings for their businesses; customers see their own
alter table bookings enable row level security;
drop policy if exists bookings_owner_select on bookings;
create policy bookings_owner_select on bookings
  for select
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

notify pgrst, 'reload schema';
