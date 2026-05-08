import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signHoldToken, verifyHoldToken } from '@/lib/mcp/tokens';
import { humaniseDateTime, formatCompactDublin } from '@/lib/checkout/format-datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hold lifetime mirrors the MCP hold-and-checkout default (10 minutes).
const HOLD_DURATION_MIN = 10;

function decodeHoldId(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return typeof body.hold_id === 'string' ? body.hold_id : null;
  } catch {
    return null;
  }
}

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
  let holdId: string | null = decodeHoldId(params.token);
  // Prefer the verified payload when present (covers the "user clicked
  // alternatives 30s after the hold landed" edge case where exp is still
  // valid). Either way we only do reads.
  const verified = await verifyHoldToken(params.token);
  if (verified) holdId = verified.hold_id;

  if (!holdId) {
    return NextResponse.json({ alternatives: [] });
  }

  const sb = supabaseAdmin();
  const { data: hold } = await sb
    .from('mcp_holds')
    .select(
      `
      id, business_id, service_id,
      bookings:booking_id ( id, businesses:business_id ( slug ), services:service_id ( id, name, duration_minutes, price_cents ) )
      `,
    )
    .eq('id', holdId)
    .maybeSingle<{
      id: string;
      business_id: string;
      service_id: string;
      bookings: {
        id: string;
        businesses: { slug: string } | null;
        services: { id: string; name: string; duration_minutes: number; price_cents: number } | null;
      } | null;
    }>();

  if (!hold || !hold.bookings || !hold.bookings.services || !hold.bookings.businesses) {
    return NextResponse.json({ alternatives: [] });
  }
  const service = hold.bookings.services;
  const slug = hold.bookings.businesses.slug;

  // Fetch availability for each of the next 7 days. Same approach the
  // hold-and-checkout SLOT_UNAVAILABLE branch uses, kept consistent so the
  // user sees the same alternatives surface in either expiry route.
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
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
  flat.sort((a, b) => a.slot_start.localeCompare(b.slot_start));

  const alternatives = flat.slice(0, 3).map((s) => {
    const startIso = new Date(s.slot_start).toISOString();
    return {
      start_iso: startIso,
      start_human: humaniseDateTime(new Date(startIso)),
      start_compact: formatCompactDublin(new Date(startIso)),
      service_name: service.name,
      price_cents: service.price_cents,
      // Send the user back to the existing consumer-app booking page.
      // That's the route the rest of the consumer flow uses for slot
      // selection; it'll create a fresh hold via the existing path.
      rebook_url: `/booking/${service.id}?start=${encodeURIComponent(startIso)}&from=mcp&slug=${encodeURIComponent(slug)}`,
    };
  });

  return NextResponse.json({ alternatives });
}

// POST /api/c/[token]/alternatives
//
// The slot-taken state on /c/[token] calls this to pick one of the offered
// alternatives. We create a fresh hold via the same atomic RPC the MCP
// hold-and-checkout tool uses, sign a new hold token, and return the new
// /c/[token] URL for the client to redirect to.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const startIso = typeof body.start_iso === 'string' ? body.start_iso : null;
  if (!startIso) {
    return NextResponse.json({ error: 'start_iso_required' }, { status: 400 });
  }
  const startAt = new Date(startIso);
  if (Number.isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'invalid_start_iso' }, { status: 400 });
  }

  let holdId: string | null = decodeHoldId(params.token);
  const verified = await verifyHoldToken(params.token);
  if (verified) holdId = verified.hold_id;
  if (!holdId) {
    return NextResponse.json({ error: 'token_unrecognised' }, { status: 404 });
  }

  const sb = supabaseAdmin();
  const { data: hold } = await sb
    .from('mcp_holds')
    .select(
      'business_id, service_id, source_assistant, customer_hints, services:service_id ( id, duration_minutes, is_active )',
    )
    .eq('id', holdId)
    .maybeSingle<{
      business_id: string;
      service_id: string;
      source_assistant: string | null;
      customer_hints: Record<string, unknown> | null;
      services: { id: string; duration_minutes: number; is_active: boolean | null } | null;
    }>();

  if (!hold || !hold.services || hold.services.is_active === false) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 404 });
  }

  const endAt = new Date(startAt.getTime() + hold.services.duration_minutes * 60_000);
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MIN * 60_000);

  const { data: rpcRows, error: rpcErr } = await sb.rpc('create_mcp_hold_atomically', {
    p_business_id: hold.business_id,
    p_service_id: hold.service_id,
    p_start_at: startAt.toISOString(),
    p_end_at: endAt.toISOString(),
    p_expires_at: expiresAt.toISOString(),
    p_source_assistant: hold.source_assistant,
    p_customer_hints: hold.customer_hints,
  });

  if (rpcErr) {
    console.error('[c/alternatives] rpc error', rpcErr);
    return NextResponse.json({ error: 'hold_failed' }, { status: 500 });
  }
  const row = Array.isArray(rpcRows) ? rpcRows[0] : null;
  if (!row || !row.hold_id || !row.booking_id) {
    return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 });
  }
  if (row.conflict_reason && row.conflict_reason !== 'NONE') {
    return NextResponse.json({ error: 'slot_unavailable' }, { status: 409 });
  }

  const newToken = await signHoldToken({
    hold_id: row.hold_id,
    booking_id: row.booking_id,
    business_id: hold.business_id,
    service_id: hold.service_id,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json({ token: newToken, expires_at: expiresAt.toISOString() });
}
