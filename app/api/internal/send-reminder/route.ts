/**
 * POST /api/internal/send-reminder
 * Body: { reminder_id: uuid }
 *
 * Called by the pg_cron drain via pg_net for a leased pending_reminders
 * row. Loads booking + business + service, builds the payload, fans out
 * to every active device token, flips the reminder row + the
 * bookings.reminder_*_sent flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPush, type PushKind } from '@/lib/push';
import { supabaseAdmin } from '@/lib/supabase';
import { checkInternalAuth } from '@/lib/internal-auth';
import { formatBookingTimeDublin } from '@/lib/dublin-time';

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

  const kind = reminder.kind as 'reminder_24h' | 'reminder_2h';

  const { data: booking } = await sb
    .from('bookings')
    .select('id, business_id, service_id, customer_id, starts_at, status')
    .eq('id', reminder.booking_id)
    .maybeSingle();

  if (!booking || !booking.customer_id) {
    await markFailed(sb, reminderId, 'booking_missing');
    return NextResponse.json({ error: 'booking_missing' }, { status: 404 });
  }
  if (booking.status !== 'confirmed') {
    await markSkipped(sb, reminderId, 'booking_not_confirmed');
    return NextResponse.json({ ok: true, skipped: 'booking_not_confirmed' });
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
  if (!tokens || tokens.length === 0) {
    await markFailed(sb, reminderId, 'no_active_tokens');
    return NextResponse.json({ error: 'no_active_tokens' }, { status: 404 });
  }

  const startsAt = new Date(booking.starts_at);
  const timeLabel = formatBookingTimeDublin(startsAt);
  const serviceName = service?.name ?? 'Your booking';

  const { title, body, pushKind } = buildPayload(kind, business.name, serviceName, timeLabel);

  const results = await Promise.all(
    tokens.map((t) =>
      sendPush(
        booking.customer_id!,
        t.token as string,
        {
          title,
          body,
          data: {
            url: `https://app.openbook.ie/consumer-bookings/${booking.id}`,
            kind: pushKind,
            booking_id: booking.id,
          },
        },
        pushKind,
      ),
    ),
  );

  const anySuccess = results.some((r) => r.success);

  if (anySuccess) {
    const now = new Date().toISOString();
    await Promise.all([
      sb
        .from('pending_reminders')
        .update({ status: 'sent', sent_at: now })
        .eq('id', reminderId),
      sb
        .from('bookings')
        .update(
          kind === 'reminder_24h'
            ? { reminder_24h_sent: true }
            : { reminder_2h_sent: true },
        )
        .eq('id', booking.id),
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

function buildPayload(
  kind: 'reminder_24h' | 'reminder_2h',
  businessName: string,
  serviceName: string,
  timeLabel: string,
): { title: string; body: string; pushKind: PushKind } {
  if (kind === 'reminder_24h') {
    return {
      title: `Tomorrow at ${businessName}`,
      body: `${serviceName} · ${timeLabel} · See you there`,
      pushKind: 'booking_reminder_24h',
    };
  }
  return {
    title: `${businessName} in 2 hours`,
    body: `${serviceName} · ${timeLabel}`,
    pushKind: 'booking_reminder_2h',
  };
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
