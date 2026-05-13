/**
 * /api/standing-slots/[id]
 *   PATCH  — update active flag, paused_until, or alert fields
 *   DELETE — remove the alert
 *
 * Ownership enforced in-query via WHERE customer_id = cookie. A request
 * for someone else's slot lands as a 404 (no row updated/deleted).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';
import { StandingSlotPatchSchema } from '@/lib/standing-slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLOT_ID = z.string().uuid();
const RATE_LIMIT_PER_MIN = 30;

async function readCustomerId(): Promise<string | null> {
  return (await cookies()).get('ob_customer_id')?.value ?? null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await ctx.params;
  const idParsed = SLOT_ID.safeParse(raw);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const body = StandingSlotPatchSchema.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body', details: body.error.issues }, { status: 400 });
  }
  if (Object.keys(body.data).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  const customerId = await readCustomerId();
  if (!customerId) {
    return NextResponse.json({ error: 'slot_not_found' }, { status: 404 });
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

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('standing_slots')
    .update(body.data)
    .eq('id', idParsed.data)
    .eq('customer_id', customerId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[standing-slots PATCH] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'slot_not_found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await ctx.params;
  const idParsed = SLOT_ID.safeParse(raw);
  if (!idParsed.success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const customerId = await readCustomerId();
  if (!customerId) return new NextResponse(null, { status: 204 });

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

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('standing_slots')
    .delete()
    .eq('id', idParsed.data)
    .eq('customer_id', customerId);

  if (error) {
    console.error('[standing-slots DELETE] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
