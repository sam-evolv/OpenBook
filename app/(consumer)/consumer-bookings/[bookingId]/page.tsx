import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, MapPin, User, Receipt, CheckCircle2, XCircle } from 'lucide-react';
import { supabaseAdmin, formatPrice, formatDuration } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { friendlyDate, timeLabel } from '@/lib/time';
import { getTileColour } from '@/lib/tile-palette';
import { BookingDetailActions } from './BookingDetailActions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ bookingId: string }>;
}

type BookingDetail = {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string | null;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'awaiting_payment';
  price_cents: number;
  notes: string | null;
  created_at: string;
  businesses: {
    id: string;
    slug: string;
    name: string;
    primary_colour: string;
    address: string | null;
    address_line: string | null;
    phone: string | null;
    whatsapp_phone_number: string | null;
    whatsapp_enabled: boolean | null;
  };
  services: {
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
  };
  staff: { id: string; name: string } | null;
};

async function getBooking(bookingId: string): Promise<BookingDetail | null> {
  // A user can reach this page two ways:
  //   - Auth-linked: bookings made via the AI tab carry customer_id =
  //     customers.id where customers.user_id = auth.uid().
  //   - Legacy guest: pre-auth bookings carry customer_id = the value
  //     in the ob_customer_id cookie set by /api/booking.
  // We accept either identity so AI-flow bookings are visible alongside
  // any prior anonymous ones from the same browser.
  const sb = supabaseAdmin();
  const cookieCustomerId = (await cookies()).get('ob_customer_id')?.value ?? null;

  let authCustomerId: string | null = null;
  try {
    const userClient = createSupabaseServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data } = await userClient
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      authCustomerId = (data?.id as string | undefined) ?? null;
    }
  } catch {
    /* fall through to cookie-only */
  }

  const allowedCustomerIds = [authCustomerId, cookieCustomerId].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  if (allowedCustomerIds.length === 0) return null;

  const { data } = await sb
    .from('bookings')
    .select(
      `
      id, business_id, service_id, customer_id, staff_id,
      starts_at, ends_at, status, price_cents, notes, created_at,
      businesses (id, slug, name, primary_colour, address, address_line, phone, whatsapp_phone_number, whatsapp_enabled),
      services (id, name, duration_minutes, price_cents),
      staff (id, name)
    `
    )
    .eq('id', bookingId)
    .in('customer_id', allowedCustomerIds)
    .maybeSingle();

  return (data as BookingDetail | null) ?? null;
}

type DisplayStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending';

function deriveDisplayStatus(b: BookingDetail): DisplayStatus {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'completed') return 'completed';
  // Treat past confirmed bookings as completed visually
  if (b.status === 'confirmed' && Date.now() > new Date(b.ends_at).getTime()) {
    return 'completed';
  }
  if (b.status === 'confirmed') return 'confirmed';
  return 'pending';
}

const STATUS_LABEL: Record<DisplayStatus, string> = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  pending: 'Pending',
};

function formatBookedOn(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', {
    timeZone: 'Europe/Dublin',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function BookingDetailPage({ params }: Props) {
  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) notFound();

  const colour = getTileColour(booking.businesses.primary_colour).mid;
  const start = new Date(booking.starts_at);
  const display = deriveDisplayStatus(booking);
  const address = booking.businesses.address ?? booking.businesses.address_line ?? null;
  const mapsHref = address
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : null;

  const StatusIcon =
    display === 'cancelled' ? XCircle : display === 'completed' ? CheckCircle2 : CheckCircle2;

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-x-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            `radial-gradient(800px 400px at 50% -10%, ${colour}14, transparent 55%),` +
            'linear-gradient(180deg, #050505 0%, #020202 100%)',
        }}
      />

      {/* Header */}
      <header className="px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-2 flex items-center gap-3">
        <Link
          href="/consumer-bookings"
          aria-label="Back"
          className="h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-xl active:scale-90 transition-transform"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[18px] font-semibold tracking-tight truncate">
            {booking.businesses.name}
          </p>
          <p className="text-[12px] text-white/55 truncate">{booking.services.name}</p>
        </div>
      </header>

      <div className="px-5 pb-[calc(48px+env(safe-area-inset-bottom))] pt-4 flex flex-col gap-5">
        {/* Hero status card */}
        <section
          className="rounded-3xl p-5 backdrop-blur-2xl"
          style={{
            background: `linear-gradient(180deg, ${colour}22 0%, rgba(255,255,255,0.03) 100%)`,
            border: `0.5px solid ${colour}55`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 36px rgba(0,0,0,0.45)',
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{
              background: display === 'cancelled' ? 'rgba(255,90,90,0.14)' : `${colour}22`,
              color: display === 'cancelled' ? '#ff8a8a' : colour,
              border:
                display === 'cancelled'
                  ? '0.5px solid rgba(255,90,90,0.35)'
                  : `0.5px solid ${colour}55`,
            }}
          >
            <StatusIcon className="h-3 w-3" strokeWidth={2.4} />
            {STATUS_LABEL[display]}
          </div>

          <h1 className="mt-3 font-serif text-[28px] font-semibold leading-tight tracking-[-0.01em]">
            {friendlyDate(start)} at {timeLabel(start)}
          </h1>
          <p className="mt-1 text-[13px] text-white/60">
            {formatDuration(booking.services.duration_minutes)}
            {booking.businesses.address ? ` · ${booking.businesses.address}` : ''}
          </p>
        </section>

        {/* Details */}
        <section
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <DetailRow
            icon={<Calendar className="h-4 w-4" style={{ color: colour }} strokeWidth={2.2} />}
            label="Service"
            value={`${booking.services.name} · ${formatDuration(booking.services.duration_minutes)}`}
          />
          <DetailRow
            icon={<Receipt className="h-4 w-4" style={{ color: colour }} strokeWidth={2.2} />}
            label="Price"
            value={booking.price_cents === 0 ? 'Free' : formatPrice(booking.price_cents)}
          />
          {address && (
            <DetailRow
              icon={<MapPin className="h-4 w-4" style={{ color: colour }} strokeWidth={2.2} />}
              label="Location"
              value={address}
              href={mapsHref ?? undefined}
            />
          )}
          {booking.staff && (
            <DetailRow
              icon={<User className="h-4 w-4" style={{ color: colour }} strokeWidth={2.2} />}
              label="With"
              value={booking.staff.name}
            />
          )}
          <DetailRow
            icon={<Clock className="h-4 w-4" style={{ color: colour }} strokeWidth={2.2} />}
            label="Booked on"
            value={formatBookedOn(booking.created_at)}
            isLast
          />
        </section>

        {/* Actions */}
        <BookingDetailActions
          bookingId={booking.id}
          serviceId={booking.service_id}
          serviceName={booking.services.name}
          startsAtIso={booking.starts_at}
          endsAtIso={booking.ends_at}
          businessName={booking.businesses.name}
          businessSlug={booking.businesses.slug}
          businessAddress={address}
          phone={booking.businesses.phone}
          whatsappPhone={
            booking.businesses.whatsapp_enabled
              ? booking.businesses.whatsapp_phone_number
              : null
          }
          accentColour={colour}
          displayStatus={display}
        />
      </div>
    </main>
  );
}

function DetailRow({
  icon,
  label,
  value,
  href,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  isLast?: boolean;
}) {
  const inner = (
    <div
      className="flex items-center gap-3 px-4 py-3.5"
      style={
        isLast ? undefined : { borderBottom: '0.5px solid rgba(255,255,255,0.06)' }
      }
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/45">
          {label}
        </p>
        <p className="text-[14px] text-white/85 truncate">{value}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block active:bg-white/[0.02]">
        {inner}
      </a>
    );
  }
  return inner;
}
