-- MCP server — Migration B
-- Adds three more MCP-related tables defined in docs/mcp-server-spec.md
-- sections 8.4, 8.5, and 8.6:
--   - public.mcp_waitlist        (8.4)
--   - public.mcp_promoted_slots  (8.5)
--   - public.booking_feedback    (8.6)
--
-- RLS is enabled on all three. Owners can read their own promoted slots and
-- their own booking feedback via the policies below. The service role
-- bypasses RLS by default, so no service-role policies are required.

-- 8.4 mcp_waitlist
create table public.mcp_waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  service_id uuid references public.services(id),
  preferred_window_start timestamptz not null,
  preferred_window_end timestamptz not null,
  contact_phone text,
  contact_email text,
  customer_hints jsonb,
  expires_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'notified', 'booked', 'expired')),
  notified_at timestamptz,
  source_assistant text,
  created_at timestamptz default now()
);
create index on public.mcp_waitlist (business_id, status, expires_at) where status = 'active';
create index on public.mcp_waitlist (preferred_window_start, preferred_window_end) where status = 'active';


-- 8.5 mcp_promoted_slots
create table public.mcp_promoted_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  service_id uuid not null references public.services(id),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  kind text not null check (kind in ('standard', 'flash_sale', 'regulars_only')),
  original_price_eur numeric(10,2) not null,
  promoted_price_eur numeric(10,2) not null,
  message text,
  is_active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz                   -- defaults to slot_start
);
create index on public.mcp_promoted_slots (is_active, slot_start) where is_active = true;
create unique index on public.mcp_promoted_slots (business_id, service_id, slot_start)
  where is_active = true;


-- 8.6 booking_feedback
create table public.booking_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) unique,
  inferred_rating smallint check (inferred_rating between 1 and 5),
  verbatim text,
  showed_up boolean,
  would_rebook boolean,
  source_assistant text,
  created_at timestamptz default now()
);
create index on public.booking_feedback (booking_id);


-- RLS
alter table public.mcp_waitlist enable row level security;
alter table public.mcp_promoted_slots enable row level security;
alter table public.booking_feedback enable row level security;

create policy "Owners read own promoted slots"
  on public.mcp_promoted_slots for select
  using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

create policy "Owners read own booking feedback"
  on public.booking_feedback for select
  using (
    booking_id in (
      select id from public.bookings
      where business_id in (
        select id from public.businesses where owner_id = auth.uid()
      )
    )
  );

-- Service role bypasses RLS by default; no other policies needed.


-- ROLLBACK (manual, run if needed):
-- drop table public.booking_feedback;
-- drop table public.mcp_promoted_slots;
-- drop table public.mcp_waitlist;
