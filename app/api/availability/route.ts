import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addMinutes, startOfDay } from '@/lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/availability?serviceId=...&date=YYYY-MM-DD
 * Returns { slots: string[] } — ISO strings of available start times.
 *
 * Logic:
 * - Look up service (for duration + business_id).
 * - Look up business_hours for that weekday.
 * - Exclude any business_closures that cover the day.
 * - Generate candidate slots every 15 minutes within opening hours.
 * - Filter out slots that overlap existing confirmed/pending bookings.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('serviceId');
  const dateStr = searchParams.get('date');

  if (!serviceId || !dateStr) {
    return NextResponse.json(
      { error: 'serviceId and date are required' },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();

  const { data: service } = await sb
    .from('services')
    .select('id, business_id, duration_minutes, is_active')
    .eq('id', serviceId)
    .maybeSingle();

  if (!service || !service.is_active) {
    return NextResponse.json({ slots: [] });
  }

  const date = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = date.getDay(); // 0 Sun … 6 Sat

  // Business hours for this weekday
  const { data: hoursRows } = await sb
    .from('business_hours')
    .select('open_time, close_time, is_closed')
    .eq('business_id', service.business_id)
    .eq('day_of_week', dayOfWeek);

  const hours = hoursRows?.[0];
  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) {
    return NextResponse.json({ slots: [] });
  }

  // Closures that cover this day
  const { data: closures } = await sb
    .from('business_closures')
    .select('start_date, end_date')
    .eq('business_id', service.business_id);

  const closed = (closures ?? []).some((c: any) => {
    const s = new Date(c.start_date);
    const e = new Date(c.end_date ?? c.start_date);
    return date >= startOfDay(s) && date <= startOfDay(e);
  });
  if (closed) return NextResponse.json({ slots: [] });

  // Candidate slots every 15 min
  const [oh, om] = hours.open_time.split(':').map(Number);
  const [ch, cm] = hours.close_time.split(':').map(Number);
  const dayStart = new Date(date);
  dayStart.setHours(oh, om, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(ch, cm, 0, 0);

  const now = new Date();
  const candidates: Date[] = [];
  for (
    let t = new Date(dayStart);
    addMinutes(t, service.duration_minutes) <= dayEnd;
    t = addMinutes(t, 15)
  ) {
    if (t > now) candidates.push(new Date(t));
  }

  if (candidates.length === 0) return NextResponse.json({ slots: [] });

  // Existing bookings for the day
  const dayStartISO = new Date(date);
  dayStartISO.setHours(0, 0, 0, 0);
  const dayEndISO = new Date(date);
  dayEndISO.setHours(23, 59, 59, 999);

  const { data: bookings } = await sb
    .from('bookings')
    .select('starts_at, ends_at, status')
    .eq('business_id', service.business_id)
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', dayStartISO.toISOString())
    .lte('starts_at', dayEndISO.toISOString());

  const busy = (bookings ?? []).map((b: any) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.ends_at).getTime(),
  }));

  const slots = candidates
    .filter((t) => {
      const s = t.getTime();
      const e = addMinutes(t, service.duration_minutes).getTime();
      return !busy.some((b) => s < b.end && e > b.start);
    })
    .map((t) => t.toISOString());

  return NextResponse.json({ slots });
}
