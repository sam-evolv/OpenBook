import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/dashboard/hours
 * Body: { businessId, hours: Array<HourRow> }
 *
 * Atomically replaces all 7 rows for the business.
 */
export async function PUT(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { businessId, hours } = await req.json();
  if (!businessId || !Array.isArray(hours)) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const { data: business } = await sb
    .from('businesses')
    .select('id, owner_id')
    .eq('id', businessId)
    .maybeSingle();
  if (!business || business.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  // Delete existing hours + insert new
  await sb.from('business_hours').delete().eq('business_id', businessId);

  const rows = hours.map((h: any) => ({
    business_id: businessId,
    day_of_week: h.day_of_week,
    open_time: h.is_closed ? null : h.open_time,
    close_time: h.is_closed ? null : h.close_time,
    is_closed: !!h.is_closed,
  }));

  const { error } = await sb.from('business_hours').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
