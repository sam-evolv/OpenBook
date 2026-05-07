// join_waitlist — when the user's preferred slot isn't available, hold
// their preference and notify when a matching slot opens.
// Spec: docs/mcp-server-spec.md section 5.7.
//
// V1 channel decision (recorded with the user before this PR was written):
// notifications go via EMAIL ONLY through the existing Resend integration.
// SMS support deferred to v1.1; the spec's primary "we send an SMS" wording
// is accommodated by the schema's notification_channels enum but not
// implemented yet. As a result, this handler requires `contact.email` —
// a phone-only waitlist would have no delivery path in v1, so we surface
// that as EMAIL_REQUIRED rather than silently accept and never notify.

import {
  joinWaitlistInput,
  joinWaitlistOutput,
} from '../../../../lib/mcp/schemas';
import { supabaseAdmin } from '../../../../lib/supabase';
import { checkWaitlistRateLimit } from '../../../../lib/mcp/waitlist-rate-limit';
import { humaniseDateTime } from '../../../../lib/checkout/format-datetime';
import type { ToolContext, ToolHandler } from './index';

const MAX_WINDOW_DAYS = 7;
const MAX_WINDOW_MS = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const PHONE_E164_RE = /^\+?[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const responseError = (code: string, message: string, extras: Record<string, unknown> = {}) => ({
  error: { code, message, ...extras },
});

export const joinWaitlistHandler: ToolHandler = async (input, ctx: ToolContext) => {
  const parsed = joinWaitlistInput.parse(input);
  const { slug, service_id, preferred_window, contact, customer_hints } = parsed;

  // ── Window validation
  const startsMs = new Date(preferred_window.starts_iso).getTime();
  const endsMs = new Date(preferred_window.ends_iso).getTime();
  if (!Number.isFinite(startsMs) || !Number.isFinite(endsMs)) {
    return responseError('INVALID_WINDOW', 'preferred_window timestamps are not valid.');
  }
  if (startsMs >= endsMs) {
    return responseError('INVALID_WINDOW', 'preferred_window.starts_iso must be before ends_iso.');
  }
  if (startsMs <= Date.now()) {
    return responseError('INVALID_WINDOW', 'preferred_window.starts_iso must be in the future.');
  }
  if (endsMs - startsMs > MAX_WINDOW_MS) {
    return responseError(
      'INVALID_WINDOW',
      `preferred_window cannot span more than ${MAX_WINDOW_DAYS} days.`,
    );
  }

  // ── Contact validation
  const phoneRaw = (contact.phone ?? '').trim();
  const phone = phoneRaw.replace(/\s+/g, '');
  const email = (contact.email ?? '').trim().toLowerCase();
  if (!phone && !email) {
    return responseError('CONTACT_REQUIRED', 'At least one of phone or email is required.');
  }
  if (phone && !PHONE_E164_RE.test(phone)) {
    return responseError('INVALID_PHONE', 'Phone must be in E.164 format (e.g. +353861234567).');
  }
  if (email && !EMAIL_RE.test(email)) {
    return responseError('INVALID_EMAIL', 'Email is not valid.');
  }
  // V1 constraint: email is the only delivery channel. Surface the gap
  // honestly so the assistant can ask the user for an email instead of
  // silently registering a waitlist that will never fire.
  if (!email) {
    return responseError(
      'EMAIL_REQUIRED',
      "We notify waitlists by email in v1; SMS support is on the way. Please share an email address so we can let you know when a slot opens.",
    );
  }

  // ── Business + service lookup
  const supa = supabaseAdmin();
  const { data: business, error: bizErr } = await supa
    .from('businesses')
    .select('id, slug, name, is_live')
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle();
  if (bizErr) {
    console.error('[mcp.join_waitlist] business lookup failed', bizErr);
    return responseError('INTERNAL_ERROR', 'Failed to fetch business.');
  }
  if (!business) {
    return responseError('BUSINESS_NOT_FOUND', 'Business not found or not currently live.');
  }

  if (service_id) {
    const { data: service } = await supa
      .from('services')
      .select('id, business_id, is_active')
      .eq('id', service_id)
      .maybeSingle();
    if (!service || service.business_id !== business.id || service.is_active === false) {
      return responseError('SERVICE_NOT_FOUND', 'Service not found or not currently active.');
    }
  }

  // ── Rate limit (Section 13.1 Threat 6 — 3 per contact per day)
  const rate = await checkWaitlistRateLimit({
    phone: phone || null,
    email: email || null,
  });
  if (!rate.allowed) {
    return responseError(
      'WAITLIST_LIMIT_EXCEEDED',
      'You have reached the maximum number of active waitlists for today (3). Try again tomorrow.',
    );
  }

  // ── Resolve expires_at
  // Default to the end of the preferred_window. If the caller provided
  // expires_at, honour it only if it is strictly in the future and not
  // beyond the preferred window — a waitlist for a window that's already
  // ended is meaningless.
  let expiresAtMs = endsMs;
  if (parsed.expires_at) {
    const candidate = new Date(parsed.expires_at).getTime();
    if (Number.isFinite(candidate) && candidate > Date.now() && candidate <= endsMs) {
      expiresAtMs = candidate;
    }
  }
  const expiresAt = new Date(expiresAtMs).toISOString();

  // ── Insert
  const { data: row, error: insertErr } = await supa
    .from('mcp_waitlist')
    .insert({
      business_id: business.id,
      service_id: service_id ?? null,
      preferred_window_start: preferred_window.starts_iso,
      preferred_window_end: preferred_window.ends_iso,
      contact_phone: phone || null,
      contact_email: email || null,
      customer_hints: customer_hints ?? null,
      expires_at: expiresAt,
      status: 'active',
      source_assistant: ctx.sourceAssistant,
    })
    .select('id')
    .single();

  if (insertErr || !row) {
    console.error('[mcp.join_waitlist] insert failed', insertErr);
    return responseError('INTERNAL_ERROR', 'Failed to create waitlist entry.');
  }

  // ── Notification channels
  // V1 emits 'email' only — see the v1 channel comment at the top of
  // this file. Once SMS lands, append 'sms' here when phone is present.
  const channels: Array<'sms' | 'email' | 'push'> = ['email'];

  const expiryHuman = humaniseDateTime(new Date(expiresAt));
  const nextStep = `I'll email you the moment a matching slot opens. The waitlist clears at ${expiryHuman}.`;

  const out = {
    waitlist_id: row.id,
    notification_channels: channels,
    expires_at: expiresAt,
    next_step_for_user: nextStep,
  };

  const validation = joinWaitlistOutput.safeParse(out);
  if (!validation.success) {
    console.error('[mcp.join_waitlist] response validation failed', validation.error.format());
    return responseError('RESPONSE_VALIDATION_FAILED', 'Internal error constructing waitlist response.');
  }
  return validation.data;
};
