/**
 * POST /api/internal/send-recap
 * Body: { reminder_id: uuid }
 *
 * Mirrors /api/internal/send-reminder for kind='recap_3h'. Called by
 * the pg_cron drain (run_drain) via pg_net for a leased
 * pending_reminders row whose kind is 'recap_3h'. Loads booking +
 * business + service, builds the "How was X?" payload, fans out to
 * every active device token, flips the pending_reminders row and
 * stamps bookings.recap_sent_at.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPush } from '@/lib/push';
import { supabaseAdmin } from '@/lib/supabase';
import { checkInternalAuth } from '@/lib/internal-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = checkInternalAuth(req);
  if (authError) return authError;

  let reminderId: string | undefined;
  try {
    const body = await req.json();
    reminderId = typeof body?.reminder_id === 'string' ? body.reminder_id : undefined;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!reminderId) {
    return NextResponse.json({ error: 'reminder_id_required' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: reminder, error: reminderErr } = await sb
    .from('pending_reminders')
    .select('id, booking_id, kind, status')
    .eq('id', reminderId)
    .maybeSingle();

  if (reminderErr || !reminder) {
    return NextResponse.json({ error: 'reminder_not_found' }, { status: 404 });
  }

  if (reminder.status === 'sent' || reminder.status === 'failed' || reminder.status === 'skipped') {
    return NextResponse.json({ ok: true, already: reminder.status });
  }

  if (reminder.kind !== 'recap_3h') {
    // Defensive: the drain routes by kind, so we should never see
    // anything else here. Skip rather than mis-fire a recap-shaped push
    // for a 24h reminder.
    await markSkipped(sb, reminderId, 'wrong_kind');
    return NextResponse.json({ ok: true, skipped: 'wrong_kind' });
  }

  const { data: booking } = await sb
    .from('bookings')
    .select('id, business_id, service_id, customer_id, status, recap_sent_at')
    .eq('id', reminder.booking_id)
    .maybeSingle();

  if (!booking || !booking.customer_id) {
    await markFailed(sb, reminderId, 'booking_missing');
    return NextResponse.json({ error: 'booking_missing' }, { status: 404 });
  }
  if (booking.status === 'cancelled') {
    await markSkipped(sb, reminderId, 'booking_cancelled');
    return NextResponse.json({ ok: true, skipped: 'booking_cancelled' });
  }
  if (booking.recap_sent_at) {
    await markSkipped(sb, reminderId, 'recap_already_sent');
    return NextResponse.json({ ok: true, skipped: 'recap_already_sent' });
  }

  const [{ data: business }, { data: service }, { data: tokens }] = await Promise.all([
    sb.from('businesses').select('id, name').eq('id', booking.business_id).maybeSingle(),
    sb.from('services').select('id, name').eq('id', booking.service_id).maybeSingle(),
    sb
      .from('push_device_tokens')
      .select('token, platform')
      .eq('customer_id', booking.customer_id)
      .eq('is_active', true),
  ]);

  if (!business) {
    await markFailed(sb, reminderId, 'business_missing');
    return NextResponse.json({ error: 'business_missing' }, { status: 404 });
  }

  const businessName = business.name;
  const serviceName = service?.name ?? 'your booking';
  const title = `How was ${businessName}?`;
  const body = `Tap to rate your visit or rebook ${serviceName}.`;

  const now = new Date().toISOString();

  // No active tokens — still stamp the booking + reminder so the in-app
  // recap card surfaces on /consumer-bookings the next time the user
  // opens the app, and the drain doesn't keep re-leasing the row.
  if (!tokens || tokens.length === 0) {
    await Promise.all([
      sb
        .from('pending_reminders')
        .update({ status: 'sent', sent_at: now })
        .eq('id', reminderId),
      sb.from('bookings').update({ recap_sent_at: now }).eq('id', booking.id),
    ]);
    return NextResponse.json({ ok: true, sent: 0, in_app_only: true });
  }

  const results = await Promise.all(
    tokens.map((t) =>
      sendPush(
        booking.customer_id!,
        t.token as string,
        {
          title,
          body,
          data: {
            url: 'https://app.openbook.ie/consumer-bookings',
            kind: 'post_visit_recap',
            booking_id: booking.id,
          },
        },
        // 'favourite' is the closest existing PushKind bucket; widen
        // PushKind to include 'post_visit_recap' in a follow-up if
        // telemetry needs to segment recap deliverability.
        'favourite',
      ),
    ),
  );

  const anySuccess = results.some((r) => r.success);

  if (anySuccess) {
    await Promise.all([
      sb
        .from('pending_reminders')
        .update({ status: 'sent', sent_at: now })
        .eq('id', reminderId),
      sb.from('bookings').update({ recap_sent_at: now }).eq('id', booking.id),
    ]);
    return NextResponse.json({
      ok: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  }

  const firstError = results.find((r) => r.error)?.error ?? 'send_failed';
  await markFailed(sb, reminderId, firstError);
  return NextResponse.json({ error: firstError }, { status: 502 });
}

async function markFailed(
  sb: ReturnType<typeof supabaseAdmin>,
  reminderId: string,
  reason: string,
): Promise<void> {
  await sb
    .from('pending_reminders')
    .update({ status: 'failed', error: reason })
    .eq('id', reminderId);
}

async function markSkipped(
  sb: ReturnType<typeof supabaseAdmin>,
  reminderId: string,
  reason: string,
): Promise<void> {
  await sb
    .from('pending_reminders')
    .update({ status: 'skipped', block_reason: reason })
    .eq('id', reminderId);
}
