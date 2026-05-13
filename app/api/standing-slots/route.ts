/**
 * /api/standing-slots
 *   POST — create a new alert
 *   GET  — list the current customer's alerts (most recent first)
 *
 * Customer identity comes from the ob_customer_id cookie. POST mints a
 * guest customer when missing (same pattern as /api/booking). GET returns
 * an empty array when there's no cookie — never mints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';
import { StandingSlotCreateSchema } from '@/lib/standing-slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_PER_MIN = 20;

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const parsed = StandingSlotCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (body.time_start >= body.time_end) {
    return NextResponse.json(
      { error: 'time_start_must_be_before_time_end' },
      { status: 400 },
    );
  }
  if (!body.business_id && !body.category) {
    return NextResponse.json(
      { error: 'business_id_or_category_required' },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  let customerId = cookieStore.get('ob_customer_id')?.value ?? null;
  const sb = supabaseAdmin();

  if (!customerId) {
    const { data: newCustomer, error: custErr } = await sb
      .from('customers')
      .insert({ full_name: 'Guest', email: null, phone: null })
      .select('id')
      .single();
    if (custErr || !newCustomer) {
      return NextResponse.json({ error: 'customer_create_failed' }, { status: 500 });
    }
    customerId = newCustomer.id as string;
    cookieStore.set('ob_customer_id', customerId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  try {
    checkRateLimit(`standing-slots:${customerId}`, RATE_LIMIT_PER_MIN);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(err.retryAfterSeconds) } },
      );
    }
    throw err;
  }

  const { data, error } = await sb
    .from('standing_slots')
    .insert({
      customer_id: customerId,
      business_id: body.business_id ?? null,
      category: body.category ?? null,
      max_price_cents: body.max_price_cents,
      day_mask: body.day_mask,
      time_start: body.time_start,
      time_end: body.time_end,
      city: body.city ?? null,
      radius_km: body.radius_km ?? 10,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[standing-slots POST] failed', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const cookieStore = await cookies();
  const customerId = cookieStore.get('ob_customer_id')?.value ?? null;
  if (!customerId) {
    return NextResponse.json({ slots: [] });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('standing_slots')
    .select('*, businesses:business_id(id, name, slug, primary_colour, logo_url)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[standing-slots GET] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ slots: data ?? [] });
}
