import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { humaniseDateTime, formatCompactDublin } from '@/lib/checkout/format-datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/c/[token]/alternatives
//
// Returns up to 3 alternative slots from the same business + service over
// the next 7 days. Used by the expired state on /c/[token].
//
// We allow expired tokens here on purpose — the user is recovering from
// an expired hold, which is exactly the case where the JWT exp claim has
// passed. Without this leniency the recovery surface dies the moment it's
// most needed.
//
// rebook_url returns a relative path to the consumer-app's existing
// booking flow ( /<slug>/book?service=<id>&start=<iso> would be ideal,
// but the existing flow is built around per-service slot pickers; we
// route the user back to the service's slot picker page where they can
// re-pick and re-hold via the standard consumer flow).

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  // verifyHoldToken returns null for expired tokens; we still need to
  // recover the hold_id from the JWT body so we can find the original
  // service. Decode the body without verifying signature for the lookup
  // hint, but DO NOT trust it for any DB writes — this route is read-only.
  let holdId: string | null = null;
  try {
    const parts = params.token.split('.');
    if (parts.length === 3) {
      const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (typeof body.hold_id === 'string') holdId = body.hold_id;
    }
  } catch {
    // Malformed token — fall through, return empty list.
  }
  // Prefer the verified payload when present (covers the "user clicked
  // alternatives 30s after the hold landed" edge case where exp is still
  // valid). Either way we only do reads.
  const verified = await verifyHoldToken(params.token);
  if (verified) holdId = verified.hold_id;

  if (!holdId) {
    return NextResponse.json({ alternatives: [] });
  }

  const sb = supabaseAdmin();

  // Sequential queries — same shape as page.tsx — so we never hit the
  // Postgrest array-vs-object cardinality ambiguity that the join syntax
  // can produce when the FK column has no unique constraint.
  const { data: hold } = await sb
    .from('mcp_holds')
    .select('id, business_id, service_id, start_at, booking_id')
    .eq('id', holdId)
    .maybeSingle<{
      id: string;
      business_id: string;
      service_id: string;
      start_at: string;
      booking_id: string | null;
    }>();

  if (!hold) {
    return NextResponse.json({ alternatives: [] });
  }

  const [bizRes, svcRes] = await Promise.all([
    sb
      .from('businesses')
      .select('slug')
      .eq('id', hold.business_id)
      .maybeSingle<{ slug: string }>(),
    sb
      .from('services')
      .select('id, name, duration_minutes, price_cents')
      .eq('id', hold.service_id)
      .maybeSingle<{ id: string; name: string; duration_minutes: number; price_cents: number }>(),
  ]);

  if (!bizRes.data || !svcRes.data) {
    return NextResponse.json({ alternatives: [] });
  }
  const slug = bizRes.data.slug;
  const service = svcRes.data;

  // Anchor the 7-day window on the original hold's start date, NOT today.
  // A user with a Monday booking that just lost their slot wants
  // alternatives near Monday, not today. We start one day before the
  // original slot and walk forward 7 days, which gives us a balanced
  // window around the user's actual intent.
  const anchor = new Date(hold.start_at);
  const startOfAnchorUtc = new Date(anchor.getTime());
  // Walk back one day, but never earlier than today (so we don't query
  // dates that have already passed).
  const todayUtc = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  let cursor = new Date(startOfAnchorUtc.getTime() - dayMs);
  if (cursor.getTime() < todayUtc.getTime()) cursor = new Date(todayUtc.getTime());

  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(cursor.getTime() + i * dayMs);
    dates.push(d.toISOString().slice(0, 10));
  }

  const results = await Promise.all(
    dates.map((d) =>
      sb.rpc('get_availability_for_ai', {
        p_business_id: hold.business_id,
        p_service_id: service.id,
        p_date: d,
      }),
    ),
  );

  const flat: Array<{ slot_start: string; slot_end: string }> = [];
  for (const r of results) {
    if (r.error || !Array.isArray(r.data)) continue;
    for (const row of r.data as Array<{ slot_start: string; slot_end: string }>) {
      flat.push(row);
    }
  }
  // Sort by proximity to the original hold's start time so the
  // user sees the closest alternatives first, not the chronologically
  // earliest ones (which may be hours-from-now slots irrelevant to a
  // user whose booking was for next Monday).
  const anchorMs = new Date(hold.start_at).getTime();
  flat.sort(
    (a, b) =>
      Math.abs(new Date(a.slot_start).getTime() - anchorMs) -
      Math.abs(new Date(b.slot_start).getTime() - anchorMs),
  );

  const alternatives = flat.slice(0, 3).map((s) => {
    const startIso = new Date(s.slot_start).toISOString();
    return {
      start_iso: startIso,
      start_human: humaniseDateTime(new Date(startIso)),
      start_compact: formatCompactDublin(new Date(startIso)),
      // Send the user back to the existing consumer-app booking page.
      // That's the route the rest of the consumer flow uses for slot
      // selection; it'll create a fresh hold via the existing path.
      rebook_url: `/booking/${service.id}?start=${encodeURIComponent(startIso)}&from=mcp&slug=${encodeURIComponent(slug)}`,
    };
  });

  return NextResponse.json({ alternatives });
}
