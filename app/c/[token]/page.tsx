import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyHoldToken } from '@/lib/mcp/tokens';
import { humaniseDateTime, formatCompactDublin } from '@/lib/checkout/format-datetime';
import { getPaymentMode } from '@/lib/payments/payment-mode';
import CheckoutClient, { type CheckoutBundle } from './CheckoutClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ token: string }> };

const FALLBACK_ACCENT = '#D4AF37';

type HoldRow = {
  id: string;
  status: string;
  expires_at: string;
  start_at: string;
  end_at: string;
  customer_hints: Record<string, unknown> | null;
  source_assistant: string | null;
  booking_id: string | null;
};

type BookingRow = {
  id: string;
  status: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  business_id: string;
  service_id: string;
};

type BusinessRow = {
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
};

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

function capFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

async function loadBundle(token: string): Promise<
  | { kind: 'expired'; reason: string; businessName?: string }
  | { kind: 'confirmed'; bundle: CheckoutBundle }
  | { kind: 'ready'; bundle: CheckoutBundle }
  | null
> {
  // ── 1. Verify the JWT ─────────────────────────────────────────────────
  const payload = await verifyHoldToken(token);
  if (!payload) return { kind: 'expired', reason: 'invalid_or_expired_token' };

  const sb = supabaseAdmin();

  // Sequential queries instead of a nested join. Each step has a clear
  // failure mode and no ambiguity around Postgrest's array-vs-object
  // cardinality on FK aliases — which previously caused fresh, valid
  // holds to fall through to the expired branch.

  // ── 2. Look up the hold ──────────────────────────────────────────────
  const { data: hold, error: holdErr } = await sb
    .from('mcp_holds')
    .select(
      'id, status, expires_at, start_at, end_at, customer_hints, source_assistant, booking_id',
    )
    .eq('id', payload.hold_id)
    .maybeSingle<HoldRow>();

  if (holdErr) {
    console.error('[checkout/page] hold lookup failed', holdErr);
    return null;
  }
  if (!hold) {
    // The token verified but no row exists — the hold has been wiped.
    return { kind: 'expired', reason: 'hold_not_found' };
  }
  if (!hold.booking_id) {
    console.error('[checkout/page] hold has no booking_id', { hold_id: hold.id });
    return null;
  }

  // ── 3. Look up the booking ──────────────────────────────────────────
  const { data: booking, error: bookErr } = await sb
    .from('bookings')
    .select('id, status, notes, starts_at, ends_at, price_cents, business_id, service_id')
    .eq('id', hold.booking_id)
    .maybeSingle<BookingRow>();

  if (bookErr) {
    console.error('[checkout/page] booking lookup failed', bookErr);
    return null;
  }
  if (!booking) {
    console.error('[checkout/page] booking missing for hold', {
      hold_id: hold.id,
      booking_id: hold.booking_id,
    });
    return null;
  }

  // ── 4. Look up the business + service in parallel ───────────────────
  const [bizRes, svcRes] = await Promise.all([
    sb
      .from('businesses')
      .select(
        'id, name, slug, category, tagline, primary_colour, logo_url, address, address_line, city, phone, stripe_account_id, stripe_charges_enabled',
      )
      .eq('id', booking.business_id)
      .maybeSingle<BusinessRow>(),
    sb
      .from('services')
      .select('id, name, duration_minutes, price_cents')
      .eq('id', booking.service_id)
      .maybeSingle<ServiceRow>(),
  ]);

  if (bizRes.error || svcRes.error) {
    console.error('[checkout/page] business/service lookup failed', {
      bizErr: bizRes.error,
      svcErr: svcRes.error,
    });
    return null;
  }
  const business = bizRes.data;
  const service = svcRes.data;
  if (!business || !service) {
    console.error('[checkout/page] business or service missing', {
      booking_id: booking.id,
      business: Boolean(business),
      service: Boolean(service),
    });
    return null;
  }

  // ── 5. Compute view-mode based on hold + booking state ──────────────
  const now = Date.now();
  const expiresAtMs = new Date(hold.expires_at).getTime();
  const bookingIsConfirmed = booking.status === 'confirmed';
  const bookingIsCancelled = booking.status === 'cancelled' || booking.status === 'expired';
  const holdIsActive = hold.status === 'pending' && expiresAtMs > now;

  // ── 6. Best-effort promoted-slot enrichment ─────────────────────────
  let isPromoted = false;
  let originalPriceCents: number | null = null;
  try {
    const { data: promo } = await sb
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

  const hints = (hold.customer_hints ?? {}) as Record<string, unknown>;
  const startsAtDate = new Date(booking.starts_at);
  // start_voice is the same warm phrasing the assistant said over voice.
  // Capitalised so it reads well as a heading on the page.
  const startVoice = capFirst(humaniseDateTime(startsAtDate));

  // Payment mode is computed server-side once so the client renders the
  // right form on first paint without an extra round trip. Free services
  // and businesses without Stripe Connect both flow through 'in_person'.
  const paymentMode = getPaymentMode(business, service);

  const bundle: CheckoutBundle = {
    token,
    hold: {
      id: hold.id,
      expires_at: hold.expires_at,
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
    source_assistant: hold.source_assistant ?? null,
    is_free: service.price_cents === 0,
    payment_mode: paymentMode,
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

  // The default outcome for a freshly-issued hold is `ready`. We only fall
  // through to `confirmed`/`expired` when the booking/hold rows say so —
  // never on data-shape ambiguity, which previously misrouted fresh holds
  // to the expired ("That slot's gone") view.
  if (bookingIsConfirmed) return { kind: 'confirmed', bundle };
  if (bookingIsCancelled || !holdIsActive) {
    return { kind: 'expired', reason: 'hold_expired', businessName: business.name };
  }
  return { kind: 'ready', bundle };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await loadBundle(token);
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
  const { token } = await params;
  const result = await loadBundle(token);
  if (!result) notFound();

  if (result.kind === 'expired') {
    return (
      <CheckoutClient
        // Render the client in expired-only mode. It fetches alternatives
        // from /api/c/[token]/alternatives — the route allows expired
        // tokens for exactly this recovery flow.
        mode="expired"
        token={token}
        expiredReason={result.reason}
        expiredBusinessName={result.businessName ?? null}
      />
    );
  }

  return (
    <CheckoutClient
      mode={result.kind}
      token={token}
      bundle={result.bundle}
    />
  );
}
