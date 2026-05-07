// Shared processor for queued waitlist notifications.
//
// Drains pending rows from mcp_waitlist_notifications, creates a hold for
// each via the same atomic RPC the standard MCP flow uses, signs the
// /c/[token] JWT, and sends an email via Resend. Used by:
//
//   1. /api/cron/notify-waitlist  — Vercel Cron path (requires Pro). Calls
//      with limit=50 and awaits the result.
//   2. /api/mcp/tools/get-availability — fire-and-forget on every
//      availability query (limit=5). The "lazy fire" path that keeps the
//      queue draining without a per-minute cron, so the project can run
//      on Vercel Hobby. See docs/mcp-server-spec.md section 5.7.
//
// Trade-off the lazy path accepts: notifications fire seconds after a
// slot frees up during busy periods (when somebody is searching), and up
// to ~30 minutes during quiet periods (when nobody is). Acceptable for
// v1; the cron path is preserved for when the user upgrades to Pro.

import { Resend } from 'resend';
import { supabaseAdmin } from '../supabase';
import { signHoldToken } from './tokens';
import { humaniseDateTime } from '../checkout/format-datetime';

const HOLD_DURATION_MS = 15 * 60 * 1000;
const EMAIL_FROM = 'OpenBook <bookings@mail.openbook.ie>';

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

type ServiceLookup = { id: string; name: string; duration_minutes: number; is_active: boolean };

type ProcessOutcome = {
  notification_id: string;
  status: 'sent' | 'skipped' | 'failed';
  error_message?: string;
};

export type ProcessSummary = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function processWaitlistNotifications(args: {
  limit: number;
}): Promise<ProcessSummary> {
  const supa = supabaseAdmin();
  const { data: pending, error } = await supa
    .from('mcp_waitlist_notifications')
    .select('id, waitlist_id, slot_start, slot_end, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(args.limit);

  if (error) {
    console.error('[mcp.process-waitlist] queue read failed', error);
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }
  if (!pending || pending.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const outcomes: ProcessOutcome[] = [];
  for (const row of pending) {
    try {
      outcomes.push(await processOne(row));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('[mcp.process-waitlist] processOne threw', { id: row.id, err });
      await markNotification(row.id, 'failed', message);
      outcomes.push({ notification_id: row.id, status: 'failed', error_message: message });
    }
  }

  return {
    processed: outcomes.length,
    sent: outcomes.filter((o) => o.status === 'sent').length,
    skipped: outcomes.filter((o) => o.status === 'skipped').length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
  };
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

  if (!waitlist.service_id) {
    // Service-agnostic waitlists need richer matching — defer to v1.1.
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
    .maybeSingle<ServiceLookup>();
  if (!service || service.is_active === false) {
    await markNotification(notification.id, 'skipped', 'service_unavailable');
    return { notification_id: notification.id, status: 'skipped' };
  }

  // Try to grab the slot atomically. SLOT_UNAVAILABLE means someone else
  // booked it between trigger time and processor invocation — skip.
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

  const holdToken = await signHoldToken({
    hold_id: rpcRow.hold_id,
    booking_id: rpcRow.booking_id,
    business_id: waitlist.business_id,
    service_id: service.id,
    expires_at: expiresAt,
  });
  const url = `${checkoutBaseUrl()}/c/${holdToken}`;

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
