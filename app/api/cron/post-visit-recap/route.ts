/**
 * Vercel Cron entrypoint for post-visit recap notifications.
 *
 * Schedule: every 15 minutes (see vercel.json).
 *
 * For each booking whose visit ended ~3 hours ago (between 3 and 3.25
 * hours back to give the cron a full window) and that hasn't been
 * recapped yet, fire one push notification per active device token
 * and stamp `recap_sent_at = now()` so it never fires twice.
 *
 * If no active push tokens exist for the customer the row is still
 * stamped — the in-app recap card on /consumer-bookings still surfaces
 * to the customer when they next open the app, so the push being
 * undeliverable should not perpetually re-queue the recap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPush } from '@/lib/push';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_LIMIT = 200;

function isAuthorisedCron(req: NextRequest): boolean {
  const expected = process.env.VERCEL_CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  return header === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  return runCron(req);
}
export async function POST(req: NextRequest) {
  return runCron(req);
}

async function runCron(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorisedCron(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const now = new Date();
  const cutoffStart = new Date(now.getTime() - 3.25 * 60 * 60 * 1000).toISOString();
  const cutoffEnd = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

  const { data: bookings, error } = await sb
    .from('bookings')
    .select(
      `
      id, customer_id, business_id,
      businesses (name),
      services (name)
    `,
    )
    .eq('status', 'confirmed')
    .is('recap_sent_at', null)
    .gte('ends_at', cutoffStart)
    .lt('ends_at', cutoffEnd)
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('[recap-cron] load failed', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, considered: 0, sent: 0 });
  }

  let sent = 0;
  let stamped = 0;
  const stampedAt = now.toISOString();

  for (const row of bookings) {
    const businessName =
      (row as { businesses?: { name?: string } | null }).businesses?.name ?? 'your visit';
    const serviceName =
      (row as { services?: { name?: string } | null }).services?.name ?? 'Booking';

    if (row.customer_id) {
      const { data: tokens } = await sb
        .from('push_device_tokens')
        .select('token')
        .eq('customer_id', row.customer_id)
        .eq('is_active', true);

      if (tokens && tokens.length > 0) {
        const results = await Promise.all(
          tokens.map((t) =>
            sendPush(
              row.customer_id!,
              t.token as string,
              {
                title: `How was ${businessName}?`,
                body: `Tap to rate your visit or rebook ${serviceName}.`,
                data: {
                  url: `https://app.openbook.ie/consumer-bookings`,
                  kind: 'post_visit_recap',
                  booking_id: row.id,
                },
              },
              // PushKind doesn't have 'post_visit_recap' yet — reuse the
              // generic 'favourite' bucket so the type narrows cleanly.
              // Add a dedicated kind in a follow-up if telemetry needs to
              // segment recap deliverability separately.
              'favourite',
            ),
          ),
        );
        if (results.some((r) => r.success)) sent += 1;
      }
    }

    const { error: stampErr } = await sb
      .from('bookings')
      .update({ recap_sent_at: stampedAt })
      .eq('id', row.id)
      .is('recap_sent_at', null);
    if (!stampErr) stamped += 1;
  }

  return NextResponse.json({ ok: true, considered: bookings.length, sent, stamped });
}
