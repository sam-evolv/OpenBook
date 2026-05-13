/**
 * POST /api/internal/send-push
 * Body: { notification_id: uuid }
 *
 * Called by the pg_cron drain via pg_net once a flash_sale_notifications
 * row has been leased to status='dispatching'. Loads the row, hydrates
 * business + service + sale, builds the push payload, fans out to every
 * active device token for the customer, and flips the row to 'sent' or
 * 'failed'. push_log writes are handled inside sendPush.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPush } from '@/lib/push';
import { supabaseAdmin } from '@/lib/supabase';
import { checkInternalAuth } from '@/lib/internal-auth';
import { formatShortSlotDublin } from '@/lib/dublin-time';
import { formatEUR } from '@/lib/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = checkInternalAuth(req);
  if (authError) return authError;

  let notificationId: string | undefined;
  try {
    const body = await req.json();
    notificationId = typeof body?.notification_id === 'string' ? body.notification_id : undefined;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!notificationId) {
    return NextResponse.json({ error: 'notification_id_required' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: notif, error: notifErr } = await sb
    .from('flash_sale_notifications')
    .select('id, customer_id, sale_id, status')
    .eq('id', notificationId)
    .maybeSingle();

  if (notifErr || !notif) {
    return NextResponse.json({ error: 'notification_not_found' }, { status: 404 });
  }

  // Idempotency guard: a retry from pg_net after we already finished is a no-op.
  if (notif.status === 'sent' || notif.status === 'failed' || notif.status === 'skipped') {
    return NextResponse.json({ ok: true, already: notif.status });
  }

  const { data: sale } = await sb
    .from('flash_sales')
    .select(
      'id, business_id, service_id, slot_time, sale_price_cents, original_price_cents',
    )
    .eq('id', notif.sale_id)
    .maybeSingle();

  if (!sale) {
    await markFailed(sb, notificationId, 'sale_missing');
    return NextResponse.json({ error: 'sale_missing' }, { status: 404 });
  }

  const [{ data: business }, { data: service }, { data: tokens }] = await Promise.all([
    sb.from('businesses').select('id, name').eq('id', sale.business_id!).maybeSingle(),
    sale.service_id
      ? sb.from('services').select('id, name').eq('id', sale.service_id).maybeSingle()
      : Promise.resolve({ data: null } as const),
    sb
      .from('push_device_tokens')
      .select('token, platform')
      .eq('customer_id', notif.customer_id)
      .eq('is_active', true),
  ]);

  if (!business) {
    await markFailed(sb, notificationId, 'business_missing');
    return NextResponse.json({ error: 'business_missing' }, { status: 404 });
  }
  if (!tokens || tokens.length === 0) {
    await markFailed(sb, notificationId, 'no_active_tokens');
    return NextResponse.json({ error: 'no_active_tokens' }, { status: 404 });
  }

  const slotShort = formatShortSlotDublin(new Date(sale.slot_time));
  const serviceName = service?.name ?? 'Open spot';
  const salePrice = formatEUR(sale.sale_price_cents);
  const originalPrice = formatEUR(sale.original_price_cents);
  const body = `${serviceName} · ${slotShort} · ${salePrice} (was ${originalPrice})`;

  const results = await Promise.all(
    tokens.map((t) =>
      sendPush(
        notif.customer_id,
        t.token as string,
        {
          title: business.name,
          body,
          data: {
            url: `https://app.openbook.ie/open-spots/${sale.id}/confirm`,
            kind: 'standing_slot_match',
            sale_id: sale.id,
            business_id: sale.business_id ?? '',
            customer_id: notif.customer_id,
          },
        },
        'standing_slot_match',
      ),
    ),
  );

  const anySuccess = results.some((r) => r.success);

  if (anySuccess) {
    await sb
      .from('flash_sale_notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notificationId);
    return NextResponse.json({
      ok: true,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  }

  const firstError = results.find((r) => r.error)?.error ?? 'send_failed';
  await markFailed(sb, notificationId, firstError);
  return NextResponse.json({ error: firstError }, { status: 502 });
}

async function markFailed(
  sb: ReturnType<typeof supabaseAdmin>,
  notificationId: string,
  reason: string,
): Promise<void> {
  await sb
    .from('flash_sale_notifications')
    .update({ status: 'failed', block_reason: reason })
    .eq('id', notificationId);
}
