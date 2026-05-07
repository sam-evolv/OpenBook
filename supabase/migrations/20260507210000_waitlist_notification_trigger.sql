-- Waitlist notification machinery — when a slot frees up, find matching
-- active waitlists and queue notification jobs for the cron to process.
--
-- Per docs/mcp-server-spec.md section 5.7 step 2: a trigger on bookings
-- (status change to cancelled/expired) fires the waitlist match. The
-- existing `_sweep_expired_holds()` function transitions
-- bookings.awaiting_payment → expired when an MCP hold's TTL passes;
-- because that's a `bookings` UPDATE, our trigger picks it up there
-- without needing a separate trigger on mcp_holds. Trust the cascade.

-- ─── Notification queue ───────────────────────────────────────────────
create table public.mcp_waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid not null references public.mcp_waitlist(id),
  booking_id uuid references public.bookings(id),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempted_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

create index on public.mcp_waitlist_notifications (status, created_at)
  where status = 'pending';

-- Service-role only; the cron endpoint runs under supabaseAdmin().
alter table public.mcp_waitlist_notifications enable row level security;


-- ─── Match function ───────────────────────────────────────────────────
-- Inserts one mcp_waitlist_notifications row per active waitlist whose
-- preferred window contains the freed slot. service_id is optional on
-- waitlists ("any service of the right category") so a NULL waitlist
-- service_id matches anything from the same business.
create or replace function public.fire_waitlist_notifications(
  p_business_id uuid,
  p_service_id uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mcp_waitlist_notifications (
    waitlist_id, slot_start, slot_end
  )
  select w.id, p_slot_start, p_slot_end
  from public.mcp_waitlist w
  where w.status = 'active'
    and w.business_id = p_business_id
    and (w.service_id is null or w.service_id = p_service_id)
    and w.preferred_window_start <= p_slot_start
    and w.preferred_window_end >= p_slot_end
    and w.expires_at > now();
end;
$$;

revoke all on function public.fire_waitlist_notifications(uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.fire_waitlist_notifications(uuid, uuid, timestamptz, timestamptz) to service_role;


-- ─── Trigger on bookings ──────────────────────────────────────────────
-- Fires when a previously-active booking transitions to a state that
-- frees the slot: cancelled (manual) or expired (sweeper). Other
-- transitions are no-ops.
create or replace function public.bookings_cancelled_fire_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status in ('cancelled', 'expired')
     and OLD.status in (
       'pending', 'confirmed', 'awaiting_payment', 'pending_payment'
     )
     and NEW.business_id is not null
     and NEW.service_id is not null
  then
    perform public.fire_waitlist_notifications(
      NEW.business_id, NEW.service_id, NEW.starts_at, NEW.ends_at
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists bookings_cancelled_fire_waitlist on public.bookings;
create trigger bookings_cancelled_fire_waitlist
  after update of status on public.bookings
  for each row execute function public.bookings_cancelled_fire_waitlist();


-- ROLLBACK (manual, run if needed):
-- drop trigger if exists bookings_cancelled_fire_waitlist on public.bookings;
-- drop function public.bookings_cancelled_fire_waitlist();
-- drop function public.fire_waitlist_notifications(uuid, uuid, timestamptz, timestamptz);
-- drop table public.mcp_waitlist_notifications;
