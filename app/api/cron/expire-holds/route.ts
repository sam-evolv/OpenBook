import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel cron — runs every minute (see vercel.json).
 * Expires any booking still in 'awaiting_payment' past its
 * hold_expires_at and flips it to 'expired'.
 *
 * Vercel cron sends GET; the request must carry
 * `Authorization: Bearer ${CRON_SECRET}`. CRON_SECRET must be
 * configured in the Vercel project env before this works.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('bookings')
    .update({ status: 'expired' })
    .eq('status', 'awaiting_payment')
    .lt('hold_expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired_count: data?.length ?? 0 });
}
