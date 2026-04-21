import type { SupabaseClient } from '@supabase/supabase-js';

const SLOT_STEP_MINUTES = 15;

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function combineDateTime(dateYmd: string, hm: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [h, min] = hm.split(':').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, 0, 0);
  return dt;
}

export interface Occupied {
  start: number; // minutes from midnight
  end: number;
}

export interface SlotGenInput {
  businessId: string;
  serviceId: string;
  staffId: string | null;
  dateYmd: string;
  excludeBookingId?: string; // reschedule: exclude self from collision check
}

/**
 * Generate the list of valid `HH:MM` start times for a (service, staff,
 * date) tuple. Composition:
 *
 *   1. business_hours[weekday]        — base open window; [] if closed
 *   2. business_closures[date]        — whole-day override; [] if closed
 *   3. service_schedules[service,day] — narrows the window if rows exist
 *   4. existing bookings (not cancelled) in the day, widened by
 *      businesses.buffer_minutes on both sides, optionally filtered to
 *      staff_id when one is supplied
 *   5. Generated 15-minute candidate starts across the open window;
 *      each candidate is kept only if [start, start + duration] fits
 *      entirely inside the open window *and* doesn't overlap any
 *      expanded booking.
 *
 * Returns the remaining starts as "HH:MM". Used by both the client-side
 * time picker (via a server action wrapper) and the server-side
 * validation in createBooking / rescheduleBooking — same logic, one
 * source of truth.
 */
export async function getAvailableSlots(
  sb: SupabaseClient,
  input: SlotGenInput,
): Promise<string[]> {
  const { businessId, serviceId, staffId, dateYmd, excludeBookingId } = input;
  const date = new Date(`${dateYmd}T00:00:00`);
  const dayOfWeek = date.getDay(); // 0 Sun..6 Sat

  const [businessRow, hourRow, closureRow, serviceRow, scheduleRows, bookingRows] =
    await Promise.all([
      sb.from('businesses').select('buffer_minutes').eq('id', businessId).maybeSingle(),
      sb
        .from('business_hours')
        .select('open_time, close_time, is_closed')
        .eq('business_id', businessId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle(),
      sb
        .from('business_closures')
        .select('date, name')
        .eq('business_id', businessId)
        .eq('date', dateYmd)
        .maybeSingle(),
      sb
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .maybeSingle(),
      sb
        .from('service_schedules')
        .select('start_time')
        .eq('service_id', serviceId)
        .eq('day_of_week', dayOfWeek),
      (() => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        let q = sb
          .from('bookings')
          .select('id, starts_at, ends_at, staff_id')
          .eq('business_id', businessId)
          .gte('starts_at', start.toISOString())
          .lt('starts_at', end.toISOString())
          .neq('status', 'cancelled');
        if (staffId) q = q.eq('staff_id', staffId);
        return q;
      })(),
    ]);

  if (closureRow.data) return []; // whole-day closed
  if (!hourRow.data || hourRow.data.is_closed) return [];
  if (!hourRow.data.open_time || !hourRow.data.close_time) return [];
  if (!serviceRow.data) return [];

  const buffer = Math.max(0, (businessRow.data?.buffer_minutes as number | null) ?? 0);
  const duration = Math.max(5, (serviceRow.data.duration_minutes as number | null) ?? 60);
  const openStart = parseHM(hourRow.data.open_time);
  const openEnd = parseHM(hourRow.data.close_time);

  // Narrow to service_schedules if any rows exist. Each row declares a
  // discrete start-time "slot"; we treat each as a duration-long window
  // (start_time → start_time + service duration). If the service isn't
  // in the schedules table, fall back to business_hours as the window.
  const scheduleStarts = ((scheduleRows.data ?? []) as { start_time: string }[]).map((r) =>
    parseHM(r.start_time),
  );
  const scheduleWindow: Array<[number, number]> =
    scheduleStarts.length > 0
      ? scheduleStarts.map((s) => [s, Math.min(openEnd, s + duration)])
      : [[openStart, openEnd]];

  // Build occupied windows (with buffer), excluding the reschedule-target
  // itself so a user moving a booking doesn't collide with it.
  const occupied: Occupied[] = ((bookingRows.data ?? []) as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
  }>)
    .filter((b) => !excludeBookingId || b.id !== excludeBookingId)
    .map((b) => {
      const s = new Date(b.starts_at);
      const e = new Date(b.ends_at);
      const startMins = s.getHours() * 60 + s.getMinutes();
      const endMins = e.getHours() * 60 + e.getMinutes();
      return {
        start: Math.max(0, startMins - buffer),
        end: Math.min(24 * 60, endMins + buffer),
      };
    });

  const result: string[] = [];
  for (const [winStart, winEnd] of scheduleWindow) {
    const firstStart = Math.ceil(winStart / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
    for (let t = firstStart; t + duration <= winEnd; t += SLOT_STEP_MINUTES) {
      const candidateEnd = t + duration;
      const overlap = occupied.some((o) => t < o.end && candidateEnd > o.start);
      if (!overlap) result.push(formatHM(t));
    }
  }

  return result;
}

/**
 * Server-side availability check used by createBooking / rescheduleBooking.
 * Returns either ok (with the confirmed slot window ready to insert) or a
 * slot_taken error with the fresh availability list so the caller can show
 * "Someone just booked that slot. Here are the latest times:".
 */
export async function checkSlotAvailability(
  sb: SupabaseClient,
  input: SlotGenInput & { time: string },
): Promise<
  | { ok: true; startsAt: string; endsAt: string; durationMinutes: number }
  | { ok: false; code: 'slot_taken'; freshSlots: string[] }
  | { ok: false; code: 'closed' | 'service_not_found'; freshSlots: [] }
> {
  const slots = await getAvailableSlots(sb, input);

  if (slots.length === 0) {
    // Could be genuinely closed OR no service. Distinguish for clearer error.
    const { data: svc } = await sb
      .from('services')
      .select('duration_minutes')
      .eq('id', input.serviceId)
      .eq('business_id', input.businessId)
      .maybeSingle();
    if (!svc) return { ok: false, code: 'service_not_found', freshSlots: [] };
    return { ok: false, code: 'closed', freshSlots: [] };
  }

  if (!slots.includes(input.time)) {
    return { ok: false, code: 'slot_taken', freshSlots: slots };
  }

  const { data: svc } = await sb
    .from('services')
    .select('duration_minutes')
    .eq('id', input.serviceId)
    .eq('business_id', input.businessId)
    .maybeSingle();
  const duration = Math.max(5, (svc?.duration_minutes as number | null) ?? 60);

  const startsAt = combineDateTime(input.dateYmd, input.time).toISOString();
  const endsAt = new Date(
    combineDateTime(input.dateYmd, input.time).getTime() + duration * 60_000,
  ).toISOString();

  return { ok: true, startsAt, endsAt, durationMinutes: duration };
}

export { SLOT_STEP_MINUTES };

// Re-exported date helper for client uses (preview routes).
export { dateKey };
