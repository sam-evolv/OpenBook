/**
 * POST /api/notifications/register-device
 * Body: { token: string, platform: 'ios' | 'android' | 'web' }
 *
 * Stores or refreshes an FCM device token for the current customer.
 * Mints a guest customer row when no ob_customer_id cookie is present —
 * same shape as /api/booking so the registration round-trip works on
 * first app launch before any sign-in.
 *
 * Upserts on (customer_id, token) — the table's UNIQUE constraint
 * ensures one row per device. Re-registering bumps last_seen_at and
 * flips is_active back to true if FCM previously rejected the token.
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android', 'web']),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
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
      console.error('[register-device] customer mint failed', custErr);
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

  const { error: upsertErr } = await sb
    .from('push_device_tokens')
    .upsert(
      {
        customer_id: customerId,
        token: body.token,
        platform: body.platform,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id,token' },
    );

  if (upsertErr) {
    console.error('[register-device] upsert failed', upsertErr);
    return NextResponse.json({ error: 'register_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
