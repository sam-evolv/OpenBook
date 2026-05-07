-- Atomic hold + booking creator for the MCP hold_and_checkout tool.
-- Two simultaneous calls for the same slot must result in exactly one
-- successful hold; this function does the conflict check and the
-- bookings + mcp_holds inserts in a single transaction.
--
-- Conflict logic mirrors get_availability_for_ai (existing bookings that
-- block the slot AND active mcp_holds), with the same buffer treatment.
--
-- Notes on column adaptation (vs the spec template):
--   - bookings has customer_id (now nullable for source='mcp' per
--     20260507190000_bookings_customer_id_nullable.sql) and price_cents
--     (NOT NULL); we look up service.price_cents and pass it through.
--   - bookings.hold_expires_at is set so the existing _sweep_expired_holds()
--     can transition this row to 'expired' on the same schedule.

create or replace function public.create_mcp_hold_atomically(
  p_business_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_expires_at timestamptz,
  p_source_assistant text,
  p_customer_hints jsonb
)
returns table (
  hold_id uuid,
  booking_id uuid,
  conflict_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold_id uuid;
  v_booking_id uuid;
  v_buffer_min int;
  v_price_cents int;
  v_conflict_count int;
  v_now timestamptz := now();
begin
  -- Service must exist, belong to the business, and be active. Capture price.
  select s.price_cents
    into v_price_cents
    from public.services s
   where s.id = p_service_id
     and s.business_id = p_business_id
     and s.is_active = true;

  if v_price_cents is null then
    return query select null::uuid, null::uuid, 'SERVICE_NOT_FOUND'::text;
    return;
  end if;

  select coalesce(b.buffer_minutes, 0) into v_buffer_min
    from public.businesses b where b.id = p_business_id;

  -- Conflict check: any blocking booking OR active mcp_hold overlapping
  -- the requested window, after applying the business buffer.
  select count(*) into v_conflict_count
  from (
    select 1
      from public.bookings bk
     where bk.business_id = p_business_id
       and bk.status in (
         'pending', 'confirmed', 'awaiting_payment', 'pending_payment'
       )
       and bk.starts_at - make_interval(mins => v_buffer_min) < p_end_at
       and bk.ends_at   + make_interval(mins => v_buffer_min) > p_start_at
    union all
    select 1
      from public.mcp_holds h
     where h.business_id = p_business_id
       and h.status = 'pending'
       and h.expires_at > v_now
       and h.start_at - make_interval(mins => v_buffer_min) < p_end_at
       and h.end_at   + make_interval(mins => v_buffer_min) > p_start_at
  ) conflicts;

  if v_conflict_count > 0 then
    return query select null::uuid, null::uuid, 'SLOT_UNAVAILABLE'::text;
    return;
  end if;

  -- Create the bookings row first so mcp_holds can FK to it.
  -- customer_id is intentionally NULL; the checkout page captures email and
  -- backfills it. price_cents is required NOT NULL on bookings.
  insert into public.bookings (
    business_id, service_id, customer_id,
    starts_at, ends_at, status, price_cents,
    source, source_assistant, hold_expires_at, created_at
  ) values (
    p_business_id, p_service_id, null,
    p_start_at, p_end_at, 'pending_payment', v_price_cents,
    'mcp', p_source_assistant, p_expires_at, v_now
  )
  returning id into v_booking_id;

  insert into public.mcp_holds (
    business_id, service_id, booking_id,
    start_at, end_at, expires_at, status,
    source_assistant, customer_hints, created_at, updated_at
  ) values (
    p_business_id, p_service_id, v_booking_id,
    p_start_at, p_end_at, p_expires_at, 'pending',
    p_source_assistant, p_customer_hints, v_now, v_now
  )
  returning id into v_hold_id;

  return query select v_hold_id, v_booking_id, null::text;
end;
$$;

revoke all on function public.create_mcp_hold_atomically(uuid, uuid, timestamptz, timestamptz, timestamptz, text, jsonb) from public;
grant execute on function public.create_mcp_hold_atomically(uuid, uuid, timestamptz, timestamptz, timestamptz, text, jsonb) to service_role;


-- ROLLBACK (manual, run if needed):
-- drop function public.create_mcp_hold_atomically(uuid, uuid, timestamptz, timestamptz, timestamptz, text, jsonb);
