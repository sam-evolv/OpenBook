import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { humaniseDateTime, formatCompactDublin } from '@/lib/checkout/format-datetime';
import CheckoutClient, { type CheckoutBundle } from './CheckoutClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: { token: string } };

const FALLBACK_ACCENT = '#D4AF37';

type HoldRow = {
  id: string;
  status: string;
  expires_at: string;
  start_at: string;
  end_at: string;
  customer_hints: Record<string, unknown> | null;
  source_assistant: string | null;
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
      category: string | null;
      tagline: string | null;
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

function capFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

async function loadBundle(token: string): Promise<
  | { kind: 'expired'; reason: string; businessName?: string; sourceAssistant: string | null }
  | { kind: 'confirmed'; bundle: CheckoutBundle }
  | { kind: 'ready'; bundle: CheckoutBundle }
  | null
> {
  const payload = await verifyHoldToken(token);
  // For an expired/invalid JWT we still try to surface source_assistant by
  // looking up the hold by hold_id from the unverified body. Read-only and
  // best-effort.
  if (!payload) {
    const sourceAssistant = await lookupSourceAssistantFromExpiredToken(token);
    return { kind: 'expired', reason: 'invalid_or_expired_token', sourceAssistant };
  }

  // Single round-trip: hold → booking → business + service.
  const { data, error } = await supabaseAdmin()
    .from('mcp_holds')
    .select(
      `
      id, status, expires_at, start_at, end_at, customer_hints, source_assistant,
      bookings:booking_id (
        id, status, notes, starts_at, ends_at, price_cents,
        businesses:business_id (
          id, name, slug, category, tagline, primary_colour, logo_url,
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
    return { kind: 'expired', reason: 'hold_not_found', sourceAssistant: null };
  }

  const booking = data.bookings;
  const business = booking.businesses!;
  const service = booking.services!;
  const now = Date.now();
  const expiresAtMs = new Date(data.expires_at).getTime();
  const isCancelled = booking.status === 'cancelled' || booking.status === 'expired';

  // Best-effort lookup of an active promoted slot matching this booking.
  // The hold flow doesn't currently pin a promoted_slot id on the booking,
  // so we infer by (business_id, service_id, slot_start). If it isn't a
  // promoted slot, we fall through silently.
  let isPromoted = false;
  let originalPriceCents: number | null = null;
  try {
    const { data: promo } = await supabaseAdmin()
      .from('mcp_promoted_slots')
      .select('original_price_eur, promoted_price_eur, is_active')
      .eq('business_id', business.id)
      .eq('service_id', service.id)
      .eq('slot_start', booking.starts_at)
      .eq('is_active', true)
      .maybeSingle();
    if (promo && Number(promo.promoted_price_eur) < Number(promo.original_price_eur)) {
      isPromoted = true;
      originalPriceCents = Math.round(Number(promo.original_price_eur) * 100);
    }
  } catch {
    // Promoted slots are an enrichment, never block render on lookup failure.
  }

  const hints = (data.customer_hints ?? {}) as Record<string, unknown>;
  const startsAtDate = new Date(booking.starts_at);
  // start_voice is the same warm phrasing the assistant said over voice.
  // Capitalised so it reads well as a heading on the page.
  const startVoice = capFirst(humaniseDateTime(startsAtDate));

  const bundle: CheckoutBundle = {
    token,
    hold: {
      id: data.id,
      expires_at: data.expires_at,
      // Server timestamp at render. Client uses this for the first-paint
      // countdown so SSR and CSR agree on initial copy and React doesn't
      // throw a hydration mismatch (fixes the #422/#425 console errors).
      server_now: new Date(now).toISOString(),
    },
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
      category: business.category,
      tagline: business.tagline,
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
    source_assistant: data.source_assistant ?? null,
    is_free: service.price_cents === 0,
    is_promoted: isPromoted,
    original_price_cents: originalPriceCents,
    start_voice: startVoice,
    formatted: {
      date_human: humaniseDateTime(startsAtDate),
      date_compact: formatCompactDublin(startsAtDate),
      end_compact: formatCompactDublin(new Date(booking.ends_at)),
    },
    stripe_publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  };

  if (booking.status === 'confirmed') return { kind: 'confirmed', bundle };
  if (isCancelled || data.status !== 'pending' || expiresAtMs <= now) {
    return {
      kind: 'expired',
      reason: 'hold_expired',
      businessName: business.name,
      sourceAssistant: data.source_assistant ?? null,
    };
  }
  return { kind: 'ready', bundle };
}

async function lookupSourceAssistantFromExpiredToken(token: string): Promise<string | null> {
  // Decode the JWT body (no signature verification). Strictly read-only —
  // we only use this hint to choose which assistant to link the user back
  // to from the expired-state UI.
  let holdId: string | null = null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (typeof body.hold_id === 'string') holdId = body.hold_id;
    }
  } catch {
    return null;
  }
  if (!holdId) return null;
  try {
    const { data } = await supabaseAdmin()
      .from('mcp_holds')
      .select('source_assistant')
      .eq('id', holdId)
      .maybeSingle<{ source_assistant: string | null }>();
    return data?.source_assistant ?? null;
  } catch {
    return null;
  }
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
    themeColor: '#080808',
    viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' },
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const result = await loadBundle(params.token);
  if (!result) notFound();

  if (result.kind === 'expired') {
    return (
      <CheckoutClient
        mode="expired"
        token={params.token}
        expiredReason={result.reason}
        expiredBusinessName={result.businessName ?? null}
        expiredSourceAssistant={result.sourceAssistant}
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
