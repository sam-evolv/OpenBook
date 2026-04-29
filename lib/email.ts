import { Resend } from 'resend';
import { render } from '@react-email/render';
import { type ReactElement } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { BookingConfirmationCustomer } from '@/emails/BookingConfirmationCustomer';
import { BookingConfirmationBusiness } from '@/emails/BookingConfirmationBusiness';

const FROM = 'OpenBook <bookings@mail.openbook.ie>';
const APP_URL = 'https://app.openbook.ie';
const DASH_URL = 'https://dash.openbook.ie';

let cached: Resend | null = null;

/**
 * Lazy singleton — instantiated on first call rather than at module load
 * so a missing RESEND_API_KEY only breaks the send path, not the build.
 * Mirrors lib/stripe.ts.
 */
export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  cached = new Resend(key);
  return cached;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
  context?: Record<string, unknown>;
}

/**
 * Renders a React Email component to HTML and sends it via Resend.
 * On failure, logs the error with optional context (e.g. booking id) and
 * re-throws so callers can decide whether to swallow or propagate.
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  context,
}: SendEmailArgs): Promise<{ id: string }> {
  const html = await render(react);

  try {
    const result = await getResend().emails.send({
      from: FROM,
      to,
      subject,
      html,
      replyTo,
    });

    if (result.error) throw result.error;
    if (!result.data?.id) {
      throw new Error('Resend returned no message id');
    }
    return { id: result.data.id };
  } catch (err) {
    console.error('email-send failed', { to, subject, context, error: err });
    throw err;
  }
}

/**
 * Format a UTC instant for human-readable display in Europe/Dublin time.
 * The "appointment time" is a property of the business location, not of
 * the reader's device — Vercel's serverless runtime is UTC, so we must
 * pin the timezone explicitly. BST (UTC+1) handling is automatic via Intl.
 */
function formatDublinDateTime(d: Date): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  const time = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return { date, time };
}

function formatDublinDateShort(d: Date): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

interface SendBookingConfirmationArgs {
  bookingId: string;
  audience: 'customer' | 'business';
}

interface BookingLookupRow {
  id: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  status: string | null;
  businesses: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    address_line: string | null;
    phone: string | null;
    owner_id: string;
  } | null;
  services: {
    name: string;
    duration_minutes: number;
  } | null;
  customers: {
    full_name: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface OwnerLookupRow {
  email: string;
  full_name: string | null;
}

/**
 * Loads a booking with all the joins email templates need, then sends
 * the appropriate confirmation. Centralising the SQL surface here keeps
 * call sites in /api/booking and /api/stripe/webhook to a single line
 * each.
 *
 * Customer audience: silently skips when customers.email is null
 * (returns null, logs once). Business audience always has owner.email
 * because owners.email is NOT NULL in the schema.
 */
export async function sendBookingConfirmation({
  bookingId,
  audience,
}: SendBookingConfirmationArgs): Promise<{ id: string } | null> {
  const sb = supabaseAdmin();
  // We fetch business → owners as a separate query rather than nesting
  // the select. PostgREST can only nest along declared FKs, and there is
  // no direct FK from businesses.owner_id → owners.id — both tables
  // reference auth.users.id. A nested select here returns PGRST200
  // ("Could not find a relationship").
  const { data: booking, error } = await sb
    .from('bookings')
    .select(
      `
      id, starts_at, ends_at, price_cents, status,
      businesses:business_id (
        id, name, slug, address, address_line, phone, owner_id
      ),
      services:service_id ( name, duration_minutes ),
      customers:customer_id ( full_name, name, email, phone )
      `,
    )
    .eq('id', bookingId)
    .maybeSingle<BookingLookupRow>();

  if (error) {
    console.error('sendBookingConfirmation: booking lookup failed', {
      bookingId,
      audience,
      error,
    });
    throw error;
  }
  if (!booking || !booking.businesses || !booking.services) {
    console.error('sendBookingConfirmation: booking missing joins', {
      bookingId,
      audience,
    });
    return null;
  }

  const startsAt = new Date(booking.starts_at);
  const business = booking.businesses;
  const service = booking.services;
  const customer = booking.customers;

  // Second roundtrip: resolve the owner via business.owner_id. Required
  // for the business-audience email; harmless extra read on the
  // customer-audience path (replyTo uses owner.email but is optional,
  // and the helper exits early before this lookup matters if there's
  // no customer.email).
  const { data: owner, error: ownerErr } = await sb
    .from('owners')
    .select('email, full_name')
    .eq('id', business.owner_id)
    .maybeSingle<OwnerLookupRow>();

  if (ownerErr) {
    console.error('sendBookingConfirmation: owner lookup failed', {
      bookingId,
      audience,
      businessId: business.id,
      error: ownerErr,
    });
    // Don't throw — for customer audience we can still send without
    // a replyTo. For business audience we'll bail in the audience
    // check below.
  }

  if (audience === 'customer') {
    if (!customer?.email) {
      console.log('sendBookingConfirmation: skipping customer email — no email on file', {
        bookingId,
      });
      return null;
    }

    const { date, time } = formatDublinDateTime(startsAt);

    return sendEmail({
      to: customer.email,
      subject: `Booking confirmed: ${service.name} at ${business.name}`,
      replyTo: owner?.email,
      context: { bookingId, audience },
      react: BookingConfirmationCustomer({
        customerName: customer.full_name ?? customer.name ?? null,
        businessName: business.name,
        serviceName: service.name,
        dateLabel: date,
        timeLabel: time,
        durationMinutes: service.duration_minutes,
        priceCents: booking.price_cents,
        businessAddress: business.address ?? business.address_line ?? null,
        businessPhone: business.phone,
        viewBookingUrl: `${APP_URL}/consumer-bookings/${booking.id}`,
      }),
    });
  }

  // audience === 'business'
  if (!owner?.email) {
    // Defensive: owners.email is NOT NULL in the schema and the FK chain
    // is established at signup, so this shouldn't fire. Skip the send
    // rather than throw — customer email may have already gone out.
    console.warn('sendBookingConfirmation: business has no owner email', {
      bookingId,
      businessId: business.id,
    });
    return null;
  }

  const { date, time } = formatDublinDateTime(startsAt);
  const subjectDate = formatDublinDateShort(startsAt);

  return sendEmail({
    to: owner.email,
    subject: `New booking: ${service.name} on ${subjectDate}`,
    context: { bookingId, audience },
    react: BookingConfirmationBusiness({
      ownerName: owner.full_name,
      businessName: business.name,
      customerName: customer?.full_name ?? customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      customerPhone: customer?.phone ?? null,
      serviceName: service.name,
      dateLabel: date,
      timeLabel: time,
      durationMinutes: service.duration_minutes,
      priceCents: booking.price_cents,
      viewInDashboardUrl: `${DASH_URL}/dashboard/bookings/${booking.id}`,
    }),
  });
}
