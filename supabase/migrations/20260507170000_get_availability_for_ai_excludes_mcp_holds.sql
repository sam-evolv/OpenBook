-- Extend public.get_availability_for_ai to also exclude slots blocked by an
-- active mcp_hold. Holds are a new layer (Migration A added the table) that
-- the original AI assistant function pre-dates.
--
-- Function body is verbatim from 20260430140000_inline_expiry_sweep_for_ai_holds.sql
-- with one change: an additional NOT EXISTS clause against public.mcp_holds in
-- the final SELECT, applying the same buffer-aware overlap logic we already
-- use for `bookings`.

create or replace function public.get_availability_for_ai(
  p_business_id uuid,
  p_service_id uuid,
  p_date date
)
returns table(slot_start timestamp with time zone, slot_end timestamp with time zone)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tz             text := 'Europe/Dublin';
  v_dow            int  := extract(dow from p_date)::int;
  v_duration_min   int;
  v_buffer_min     int;
  v_open_time      time;
  v_close_time     time;
  v_is_open        boolean;
  v_is_closed      boolean;
  v_now            timestamptz := now();
  v_has_schedules  boolean;
begin
  -- Inline expiry sweep. Replaces the rejected Vercel cron route.
  perform public._sweep_expired_holds();

  -- TODO: capacity-aware availability when services.capacity > 1

  select s.duration_minutes
    into v_duration_min
    from public.services s
   where s.id = p_service_id
     and s.business_id = p_business_id
     and s.is_active = true;

  if v_duration_min is null then
    return;
  end if;

  select coalesce(b.buffer_minutes, 0)
    into v_buffer_min
    from public.businesses b
   where b.id = p_business_id;

  if exists (
    select 1 from public.business_closures bc
     where bc.business_id = p_business_id
       and bc.date = p_date
  ) then
    return;
  end if;

  select bh.is_open, bh.is_closed, bh.open_time, bh.close_time
    into v_is_open, v_is_closed, v_open_time, v_close_time
    from public.business_hours bh
   where bh.business_id = p_business_id
     and bh.day_of_week = v_dow
   limit 1;

  if v_open_time is null or v_close_time is null
     or coalesce(v_is_closed, false) = true
     or coalesce(v_is_open, true) = false
  then
    return;
  end if;

  select exists (
    select 1 from public.service_schedules ss
     where ss.service_id = p_service_id
       and ss.day_of_week = v_dow
  ) into v_has_schedules;

  return query
  with bounds as (
    select
      ((p_date::text || ' ' || v_open_time::text)::timestamp
        at time zone v_tz) as day_open,
      ((p_date::text || ' ' || v_close_time::text)::timestamp
        at time zone v_tz) as day_close
  ),
  candidates as (
    select
      ((p_date::text || ' ' || ss.start_time::text)::timestamp
        at time zone v_tz) as s
    from public.service_schedules ss
    where v_has_schedules
      and ss.service_id = p_service_id
      and ss.day_of_week = v_dow

    union all

    select gs as s
    from bounds, generate_series(
      bounds.day_open,
      bounds.day_close - make_interval(mins => v_duration_min),
      interval '15 minutes'
    ) as gs
    where not v_has_schedules
  ),
  enriched as (
    select c.s as slot_start,
           c.s + make_interval(mins => v_duration_min) as slot_end
    from candidates c, bounds
    where c.s >= bounds.day_open
      and c.s + make_interval(mins => v_duration_min) <= bounds.day_close
      and c.s > v_now
  )
  select e.slot_start, e.slot_end
  from enriched e
  where not exists (
    select 1
      from public.bookings bk
     where bk.business_id = p_business_id
       and bk.status in ('pending','confirmed','awaiting_payment')
       and bk.starts_at - make_interval(mins => v_buffer_min) < e.slot_end
       and bk.ends_at   + make_interval(mins => v_buffer_min) > e.slot_start
  )
    and not exists (
    -- mcp_holds is a new layer (Migration A). An active pending hold blocks
    -- the slot the same way a booking does, until the hold expires or is
    -- released. Same buffer treatment for consistency.
    select 1
      from public.mcp_holds h
     where h.business_id = p_business_id
       and h.status = 'pending'
       and h.expires_at > v_now
       and h.start_at - make_interval(mins => v_buffer_min) < e.slot_end
       and h.end_at   + make_interval(mins => v_buffer_min) > e.slot_start
  )
  order by e.slot_start;
end;
$function$;

revoke all on function public.get_availability_for_ai(uuid, uuid, date) from public;
grant execute on function public.get_availability_for_ai(uuid, uuid, date) to anon, authenticated, service_role;


-- ROLLBACK (manual, run if needed):
-- Re-apply the previous function body from
-- supabase/migrations/20260430140000_inline_expiry_sweep_for_ai_holds.sql.
