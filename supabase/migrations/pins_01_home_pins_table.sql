-- Home pins — businesses a customer has chosen to keep on their home screen.
-- Explore is the catalog; home is curated. Same mental model as iPhone home
-- screen vs App Library.
--
-- Service role bypasses RLS by default; all access is gated server-side by
-- the ob_customer_id cookie pattern shared with /api/booking and
-- /api/open-spots/[saleId]/claim. No SELECT/INSERT policies for the
-- `authenticated` role — auth-via-cookie is the only path.
--
-- Cross-PR contract (PR 4b standing-alerts trigger): the
-- notifications_enabled flag on this table is the source of truth for
-- whether a customer wants pushes from a given business. PR 4b will gate
-- its push-sender by EXISTS (… AND notifications_enabled = true) against
-- this table.

create table public.home_pins (
    customer_id uuid not null references public.customers(id) on delete cascade,
    business_id uuid not null references public.businesses(id) on delete cascade,
    pinned_at timestamptz not null default now(),
    notifications_enabled boolean not null default true,
    primary key (customer_id, business_id)
);

create index home_pins_customer_pinned_at_idx
    on public.home_pins(customer_id, pinned_at desc);

alter table public.home_pins enable row level security;

-- ROLLBACK (manual, run if needed):
-- drop table public.home_pins;
