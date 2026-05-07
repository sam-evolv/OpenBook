// Waitlist notification cron — runs every minute (Vercel Cron) to drain
// pending mcp_waitlist_notifications rows (queued by the
// bookings_cancelled_fire_waitlist trigger when a slot frees up).
//
// V1 scope: email-only via Resend (chosen with the user before this PR).
// SMS deferred. If a notification's waitlist row has no contact_email,
// the row is marked 'skipped' and we move on — the join_waitlist handler
// already enforces email at intake, so this is a defensive guard for
// rows that may have been written before the EMAIL_REQUIRED check
// existed (or via direct SQL).
//
// For each pending row:
//   1. Fetch waitlist + business + service.
//   2. Try to create a fresh hold via create_mcp_hold_atomically. If
//      SLOT_UNAVAILABLE (race: someone else booked it in the few seconds
//      between trigger fire and cron tick), mark 'skipped' and continue.
//   3. Sign a hold token (same /c/[token] mechanism as hold_and_checkout)
//      with a 15-minute expiry — slightly longer than the standard 10
//      minutes because the waitlisted user may be away from their phone.
//   4. Send email via Resend with the booking link.
//   5. Mark notification 'sent' + waitlist 'notified'.
//   6. On any failure: mark notification 'failed' with error_message.
//      One attempt only in v1; can be retried later by hand.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';
import { signHoldToken } from '@/lib/mcp/tokens';
import { humaniseDateTime } from '@/lib/checkout/format-datetime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 50;
const HOLD_DURATION_MS = 15 * 60 * 1000;
const EMAIL_FROM = 'OpenBook <bookings@mail.openbook.ie>';

// Vercel sends Authorization: Bearer <CRON_SECRET> when invoking from
// vercel.json crons. Match that header here so external callers can't
// trigger the endpoint and burn through the queue. See
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
function isAuthorisedCron(req: NextRequest): boolean {
  const expected = process.env.VERCEL_CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  return header === `Bearer ${expected}`;
}

type NotificationRow = {
  id: string;
  waitlist_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
};

type WaitlistDetails = {
  id: string;
  business_id: string;
  service_id: string | null;
  contact_email: string | null;
  customer_hints: Record<string, unknown> | null;
  expires_at: string;
  status: string;
  businesses: {
    id: string;
    name: string;
    slug: string;
    primary_colour: string | null;
  } | null;
};

type ServiceLookup = { id: string; name: string; duration_minutes: number };

type ProcessOutcome = {
  notification_id: string;
  status: 'sent' | 'skipped' | 'failed';
  error_message?: string;
};

const APP_DOMAIN = process.env.APP_DOMAIN ?? 'app.openbook.ie';
function checkoutBaseUrl(): string {
  if (APP_DOMAIN.startsWith('http://') || APP_DOMAIN.startsWith('https://')) return APP_DOMAIN;
  return `https://${APP_DOMAIN}`;
}

let resendCache: Resend | null = null;
function getResendClient(): Resend {
  if (resendCache) return resendCache;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  resendCache = new Resend(key);
  return resendCache;
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

  const supa = supabaseAdmin();
  const { data: pending, error } = await supa
    .from('mcp_waitlist_notifications')
    .select('id, waitlist_id, slot_start, slot_end, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('[cron.notify-waitlist] queue read failed', error);
    return NextResponse.json({ error: 'queue_read_failed' }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, deferred: 0 });
  }

  const outcomes: ProcessOutcome[] = [];
  for (const row of pending) {
    try {
      outcomes.push(await processOne(row));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('[cron.notify-waitlist] processOne threw', { id: row.id, err });
      await markNotification(row.id, 'failed', message);
      outcomes.push({ notification_id: row.id, status: 'failed', error_message: message });
    }
  }

  return NextResponse.json({
    processed: outcomes.length,
    sent: outcomes.filter((o) => o.status === 'sent').length,
    skipped: outcomes.filter((o) => o.status === 'skipped').length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
  });
}

async function processOne(notification: NotificationRow): Promise<ProcessOutcome> {
  const supa = supabaseAdmin();

  const { data: waitlist, error: waitlistErr } = await supa
    .from('mcp_waitlist')
    .select(
      `
      id, business_id, service_id, contact_email, customer_hints,
      expires_at, status,
      businesses:business_id ( id, name, slug, primary_colour )
      `,
    )
    .eq('id', notification.waitlist_id)
    .maybeSingle<WaitlistDetails>();

  if (waitlistErr || !waitlist || !waitlist.businesses) {
    await markNotification(notification.id, 'failed', 'waitlist_lookup_failed');
    return { notification_id: notification.id, status: 'failed', error_message: 'waitlist_lookup_failed' };
  }

  // The trigger queues notifications without checking that the waitlist
  // is still active — guard here so a stale row that's already been
  // notified or expired doesn't fire again.
  if (waitlist.status !== 'active') {
    await markNotification(notification.id, 'skipped', `waitlist_status_${waitlist.status}`);
    return { notification_id: notification.id, status: 'skipped' };
  }

  if (!waitlist.contact_email) {
    // V1 is email-only. A row with no email has no delivery path; skip
    // honestly rather than mark 'sent' against nothing.
    await markNotification(notification.id, 'skipped', 'no_email_v1_constraint');
    return { notification_id: notification.id, status: 'skipped' };
  }

  // Need a service_id to create the hold. Waitlist may have been registered
  // service-agnostic; in that case we can't book a specific slot, just
  // tell the user something opened. For v1 we skip service-agnostic
  // waitlists at this stage — they'll need a service_id to hold against.
  // (The trigger only fires for specific bookings, which always have a
  // service_id, so most rows hit a concrete service through the
  // notification's slot_start/slot_end window — but if the waitlist was
  // registered without a service_id, we don't know which to hold.)
  if (!waitlist.service_id) {
    await markNotification(
      notification.id,
      'skipped',
      'service_agnostic_waitlist_unsupported_v1',
    );
    return { notification_id: notification.id, status: 'skipped' };
  }

  const { data: service } = await supa
    .from('services')
    .select('id, name, duration_minutes, is_active')
    .eq('id', waitlist.service_id)
    .maybeSingle<ServiceLookup & { is_active: boolean }>();
  if (!service || service.is_active === false) {
    await markNotification(notification.id, 'skipped', 'service_unavailable');
    return { notification_id: notification.id, status: 'skipped' };
  }

  // Try to grab the slot atomically. SLOT_UNAVAILABLE means someone else
  // booked it between trigger time and cron tick — fine, skip this one.
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString();
  const { data: rpcRows, error: rpcErr } = await supa.rpc('create_mcp_hold_atomically', {
    p_business_id: waitlist.business_id,
    p_service_id: service.id,
    p_start_at: notification.slot_start,
    p_end_at: notification.slot_end,
    p_expires_at: expiresAt,
    p_source_assistant: 'waitlist',
    p_customer_hints: waitlist.customer_hints ?? null,
  });
  if (rpcErr) {
    await markNotification(notification.id, 'failed', `hold_rpc_error: ${rpcErr.message ?? 'unknown'}`);
    return { notification_id: notification.id, status: 'failed', error_message: rpcErr.message };
  }
  const rpcRow = Array.isArray(rpcRows) ? rpcRows[0] : null;
  if (!rpcRow || rpcRow.conflict_reason === 'SLOT_UNAVAILABLE' || !rpcRow.hold_id || !rpcRow.booking_id) {
    await markNotification(
      notification.id,
      'skipped',
      rpcRow?.conflict_reason ?? 'no_hold_returned',
    );
    return { notification_id: notification.id, status: 'skipped' };
  }

  // Sign the same /c/[token] hold token MCP uses for the standard flow.
  const holdToken = await signHoldToken({
    hold_id: rpcRow.hold_id,
    booking_id: rpcRow.booking_id,
    business_id: waitlist.business_id,
    service_id: service.id,
    expires_at: expiresAt,
  });
  const url = `${checkoutBaseUrl()}/c/${holdToken}`;

  // Send the notification email.
  try {
    await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: waitlist.contact_email,
      subject: `Your ${service.name} slot just opened at ${waitlist.businesses.name}`,
      html: renderEmailHtml({
        businessName: waitlist.businesses.name,
        serviceName: service.name,
        slotHuman: humaniseDateTime(new Date(notification.slot_start)),
        url,
        accent: waitlist.businesses.primary_colour ?? '#0F172A',
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'send_failed';
    await markNotification(notification.id, 'failed', message);
    return { notification_id: notification.id, status: 'failed', error_message: message };
  }

  // Mark both rows. Best-effort waitlist update — if it errors, the
  // notification is already 'sent', so we don't roll back.
  await supa
    .from('mcp_waitlist_notifications')
    .update({
      status: 'sent',
      attempted_at: new Date().toISOString(),
      booking_id: rpcRow.booking_id,
    })
    .eq('id', notification.id);

  await supa
    .from('mcp_waitlist')
    .update({ status: 'notified', notified_at: new Date().toISOString() })
    .eq('id', waitlist.id);

  return { notification_id: notification.id, status: 'sent' };
}

async function markNotification(
  id: string,
  status: 'failed' | 'skipped',
  reason: string,
): Promise<void> {
  await supabaseAdmin()
    .from('mcp_waitlist_notifications')
    .update({
      status,
      attempted_at: new Date().toISOString(),
      error_message: reason.slice(0, 500),
    })
    .eq('id', id);
}

function renderEmailHtml(args: {
  businessName: string;
  serviceName: string;
  slotHuman: string;
  url: string;
  accent: string;
}): string {
  // Simple inline HTML — the v1.1 task is to template this via @react-email
  // in line with the existing booking confirmations. For now keep it
  // self-contained so this PR doesn't add a new template file.
  const safe = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Slot opened</title></head>
<body style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Your slot just opened</h1>
  <p style="font-size: 16px; line-height: 1.5;">
    Good news — your <strong>${safe(args.serviceName)}</strong> slot at
    <strong>${safe(args.businessName)}</strong> is available
    <strong>${safe(args.slotHuman)}</strong>.
  </p>
  <p style="margin: 24px 0;">
    <a href="${safe(args.url)}"
       style="display: inline-block; padding: 14px 24px; background: ${safe(args.accent)};
              color: #fff; text-decoration: none; border-radius: 12px; font-weight: 600;">
      Book in one tap
    </a>
  </p>
  <p style="font-size: 13px; color: #666;">Held for 15 minutes. After that the slot is back up for grabs.</p>
  <p style="font-size: 12px; color: #999; margin-top: 32px;">Powered by OpenBook.</p>
</body></html>`;
}
