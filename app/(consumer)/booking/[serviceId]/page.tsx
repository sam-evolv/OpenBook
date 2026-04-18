import { notFound } from 'next/navigation';
import Image from 'next/image';
import { supabaseAdmin, formatPrice, formatDuration } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { SlotPicker } from './SlotPicker';

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
  params: { serviceId: string };
}) {
  const ctx = await getBookingContext(params.serviceId);
  if (!ctx) notFound();

  const { service, business } = ctx;
  const colour = business.primary_colour || '#D4AF37';

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

      <ConsumerHeader domain="openbook.ie" />

      <div className="pb-36">
        {/* Summary header */}
        <div className="px-5 pt-4">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase mb-2">
            Booking
          </p>
          <div
            className="
              flex items-center gap-3 p-3 rounded-2xl
              bg-white/[0.04] border border-white/[0.06]
            "
          >
            <div
              className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0"
              style={{
                background: `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`,
              }}
            >
              {business.cover_image_url && (
                <Image
                  src={business.cover_image_url}
                  alt={business.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white/55 truncate">
                {business.name}
              </p>
              <h1 className="text-[17px] font-semibold tracking-tight truncate">
                {service.name}
              </h1>
              <p className="mt-0.5 text-[12px] text-white/55">
                {formatDuration(service.duration_minutes)} ·{' '}
                <span style={{ color: colour }} className="font-semibold">
                  {formatPrice(service.price_cents)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <SlotPicker
          serviceId={service.id}
          businessId={business.id}
          businessSlug={business.slug}
          colour={colour}
        />
      </div>

      <BottomTabBar />
    </main>
  );
}
