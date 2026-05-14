import { notFound } from 'next/navigation';
import Image from 'next/image';
import { supabaseAdmin, formatServicePrice, formatDuration } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { SlotPicker } from './SlotPicker';
import { getTileColour } from '@/lib/tile-palette';

export const dynamic = 'force-dynamic';

async function getBookingContext(serviceId: string) {
  const sb = supabaseAdmin();
  const { data: service } = await sb
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('is_active', true)
    .maybeSingle();

  if (!service) return null;

  const { data: business } = await sb
    .from('businesses')
    .select('*')
    .eq('id', service.business_id)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) return null;

  return { service, business };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const ctx = await getBookingContext(serviceId);
  if (!ctx) notFound();

  const { service, business } = ctx;
  const colour = getTileColour(business.primary_colour).mid;
  const requiresOnlinePayment =
    Boolean(business.stripe_account_id) &&
    business.stripe_charges_enabled === true &&
    service.price_cents > 0;

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 500px at 50% -10%, ${colour}22 0%, transparent 55%),
            linear-gradient(180deg, #060606 0%, #020202 100%)
          `,
        }}
      />

      <ConsumerHeader />

      <div className="mx-auto max-w-md pb-[280px]">
        {/* Summary header */}
        <div className="px-5 pt-4">
          <div
            className="overflow-hidden rounded-[30px] p-4"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.035) 100%)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 48px rgba(0,0,0,0.34)',
            }}
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: colour }}>
              Booking
            </p>
            <div className="flex items-center gap-3">
              <div
                className="relative w-16 h-16 rounded-[20px] overflow-hidden shrink-0"
                style={{
                  background: `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`,
                }}
              >
                {business.cover_image_url && (
                  <Image
                    src={business.cover_image_url}
                    alt={business.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/55 truncate">
                  {business.name}
                </p>
                <h1 className="font-serif text-[23px] font-semibold leading-tight tracking-[-0.02em] truncate">
                  {service.name}
                </h1>
                <p className="mt-1 text-[12.5px] text-white/58">
                  {formatDuration(service.duration_minutes)} ·{' '}
                  <span style={{ color: colour }} className="font-semibold">
                    {formatServicePrice(service.price_cents)}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-white/[0.07] bg-black/20 px-4 py-3">
              <p className="text-[12.5px] leading-snug text-white/60">
                {requiresOnlinePayment
                  ? 'Choose a time, then pay securely with Stripe to lock it in.'
                  : 'Choose a time and your booking is confirmed immediately.'}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <p className="text-[12.5px] leading-snug text-white/60">
              {requiresOnlinePayment
                ? 'Your slot is held after you tap confirm, then you pay securely with Stripe to lock it in.'
                : 'Your booking is confirmed immediately. If payment is needed, you pay the business directly.'}
            </p>
          </div>
        </div>

        <SlotPicker
          serviceId={service.id}
          businessId={business.id}
          businessSlug={business.slug}
          colour={colour}
          requiresOnlinePayment={requiresOnlinePayment}
        />
      </div>

      <BottomTabBar />
    </main>
  );
}
