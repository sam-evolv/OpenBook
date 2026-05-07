import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { humaniseDateTime, formatCompactDublin } from '@/lib/checkout/format-datetime';
import CheckoutClient, { type CheckoutBundle } from './CheckoutClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: { token: string } };

const FALLBACK_ACCENT = '#0F172A';

type HoldRow = {
  id: string;
  status: string;
  expires_at: string;
  start_at: string;
  end_at: string;
  customer_hints: Record<string, unknown> | null;
  bookings: {
    id: string;
    status: string | null;
    notes: string | null;
    starts_at: string;
    ends_at: string;
    price_cents: number;
    businesses: {
      id: string;
      name: string;
      slug: string;
      primary_colour: string | null;
      logo_url: string | null;
      address: string | null;
      address_line: string | null;
      city: string | null;
      phone: string | null;
      stripe_account_id: string | null;
      stripe_charges_enabled: boolean | null;
    } | null;
    services: {
      id: string;
      name: string;
      duration_minutes: number;
      price_cents: number;
    } | null;
  } | null;
};

async function loadBundle(token: string): Promise<
  | { kind: 'expired'; reason: string; businessName?: string }
  | { kind: 'confirmed'; bundle: CheckoutBundle }
  | { kind: 'ready'; bundle: CheckoutBundle }
  | null
> {
  const payload = await verifyHoldToken(token);
  if (!payload) return { kind: 'expired', reason: 'invalid_or_expired_token' };

  // Single round-trip: hold → booking → business + service.
  const { data, error } = await supabaseAdmin()
    .from('mcp_holds')
    .select(
      `
      id, status, expires_at, start_at, end_at, customer_hints,
      bookings:booking_id (
        id, status, notes, starts_at, ends_at, price_cents,
        businesses:business_id (
          id, name, slug, primary_colour, logo_url,
          address, address_line, city, phone,
          stripe_account_id, stripe_charges_enabled
        ),
        services:service_id ( id, name, duration_minutes, price_cents )
      )
      `,
    )
    .eq('id', payload.hold_id)
    .maybeSingle<HoldRow>();

  if (error) {
    console.error('[checkout/page] hold lookup failed', error);
    return null;
  }
  if (!data || !data.bookings || !data.bookings.businesses || !data.bookings.services) {
    return { kind: 'expired', reason: 'hold_not_found' };
  }

  const booking = data.bookings;
  const business = booking.businesses!;
  const service = booking.services!;
  const now = Date.now();
  const expiresAtMs = new Date(data.expires_at).getTime();
  const isCancelled = booking.status === 'cancelled' || booking.status === 'expired';

  const hints = (data.customer_hints ?? {}) as Record<string, unknown>;
  const bundle: CheckoutBundle = {
    token,
    hold: { id: data.id, expires_at: data.expires_at },
    booking: {
      id: booking.id,
      status: booking.status,
      starts_at: booking.starts_at,
      ends_at: booking.ends_at,
      notes: booking.notes,
    },
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      primary_colour: business.primary_colour ?? FALLBACK_ACCENT,
      logo_url: business.logo_url,
      address: business.address ?? business.address_line ?? null,
      city: business.city,
      phone: business.phone,
      stripe_account_id: business.stripe_account_id,
      stripe_charges_enabled: business.stripe_charges_enabled === true,
    },
    service: {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      price_cents: service.price_cents,
    },
    customer_hints: {
      name: typeof hints.name === 'string' ? hints.name : null,
      email: typeof hints.email === 'string' ? hints.email : null,
      phone: typeof hints.phone === 'string' ? hints.phone : null,
      notes: typeof hints.notes === 'string' ? hints.notes : null,
    },
    is_free: service.price_cents === 0,
    formatted: {
      date_human: humaniseDateTime(new Date(booking.starts_at)),
      date_compact: formatCompactDublin(new Date(booking.starts_at)),
      end_compact: formatCompactDublin(new Date(booking.ends_at)),
    },
    stripe_publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  };

  if (booking.status === 'confirmed') return { kind: 'confirmed', bundle };
  if (isCancelled || data.status !== 'pending' || expiresAtMs <= now) {
    return { kind: 'expired', reason: 'hold_expired', businessName: business.name };
  }
  return { kind: 'ready', bundle };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await loadBundle(params.token);
  if (!result || result.kind === 'expired') {
    return { title: 'Booking — OpenBook' };
  }
  const b = result.bundle;
  return {
    title: `Confirm your booking — ${b.business.name}`,
    description: `${b.service.name} on ${b.formatted.date_compact}`,
    themeColor: b.business.primary_colour ?? FALLBACK_ACCENT,
    viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' },
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const result = await loadBundle(params.token);
  if (!result) notFound();

  if (result.kind === 'expired') {
    return (
      <CheckoutClient
        // Render the client in expired-only mode. It fetches alternatives
        // from /api/c/[token]/alternatives — the route allows expired
        // tokens for exactly this recovery flow.
        mode="expired"
        token={params.token}
        expiredReason={result.reason}
        expiredBusinessName={result.businessName ?? null}
      />
    );
  }

  return (
    <CheckoutClient
      mode={result.kind}
      token={params.token}
      bundle={result.bundle}
    />
  );
}
