import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Phone, Globe, Clock } from 'lucide-react';
import {
  supabaseAdmin,
  type Business,
  type Service,
  formatPrice,
  formatDuration,
} from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function getBusinessBySlug(slug: string): Promise<{
  business: Business | null;
  services: Service[];
}> {
  const sb = supabaseAdmin();
  const { data: business } = await sb
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_live', true)
    .maybeSingle();

  if (!business) return { business: null, services: [] };

  const { data: services } = await sb
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  return { business: business as Business, services: (services ?? []) as Service[] };
}

export default async function BusinessPage({
  params,
}: {
  params: { slug: string };
}) {
  const { business, services } = await getBusinessBySlug(params.slug);
  if (!business) notFound();

  const colour = business.primary_colour || '#D4AF37';

  return (
    <main className="relative min-h-[100dvh] text-white antialiased overflow-hidden">
      {/* Tinted background */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 500px at 50% -10%, ${colour}33 0%, transparent 55%),
            linear-gradient(180deg, #060606 0%, #020202 100%)
          `,
        }}
      />

      <ConsumerHeader domain="openbook.ie" />

      <div className="pb-36">
        {/* Hero */}
        <div className="px-5 pt-2">
          <div
            className="
              relative rounded-[28px] overflow-hidden
              border border-white/[0.08]
              shadow-[0_24px_60px_rgba(0,0,0,0.5)]
            "
          >
            <div className="relative aspect-[16/10] w-full">
              {business.cover_image_url ? (
                <Image
                  src={business.cover_image_url}
                  alt={business.name}
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: `linear-gradient(145deg, ${colour} 0%, #0a0a0a 100%)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="
                      inline-flex items-center h-[22px] px-2 rounded-md
                      text-[11px] font-semibold tracking-wide
                    "
                    style={{
                      backgroundColor: `${colour}26`,
                      color: colour,
                      border: `1px solid ${colour}55`,
                    }}
                  >
                    {business.category}
                  </span>
                  {business.city && (
                    <span className="text-[12px] text-white/55">
                      {business.city}
                    </span>
                  )}
                </div>
                <h1 className="text-[30px] font-bold tracking-tight leading-none">
                  {business.name}
                </h1>
                <div className="mt-2 flex items-center gap-2">
                  <Star
                    className="w-[14px] h-[14px]"
                    strokeWidth={0}
                    style={{ fill: colour, color: colour }}
                  />
                  <span className="text-[13px] font-medium text-white/85">
                    {(business.rating ?? 5).toFixed(1)}
                  </span>
                  <span className="text-white/25 text-[13px]">·</span>
                  <span className="text-[13px] font-medium text-white/85">
                    {'€'.repeat(Math.min(4, Math.max(1, business.price_tier ?? 2)))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        {business.description && (
          <section className="px-5 mt-6">
            <p className="text-[15px] text-white/75 leading-relaxed">
              {business.description}
            </p>
          </section>
        )}

        {/* Quick info */}
        <section className="px-5 mt-5">
          <div className="grid grid-cols-1 gap-2">
            {business.address_line && (
              <InfoRow icon={<MapPin className="w-4 h-4" />} label={business.address_line} />
            )}
            {business.phone && (
              <InfoRow icon={<Phone className="w-4 h-4" />} label={business.phone} />
            )}
            {business.website && (
              <InfoRow icon={<Globe className="w-4 h-4" />} label={business.website} />
            )}
          </div>
        </section>

        {/* Services */}
        <section className="px-5 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase">
              Services
            </h2>
            <span className="text-[12px] text-white/40">
              {services.length} available
            </span>
          </div>

          {services.length === 0 ? (
            <div className="py-10 text-center text-white/40 text-[14px]">
              No services available yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {services.map((s) => (
                <ServiceRow key={s.id} service={s} colour={colour} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomTabBar />
    </main>
  );
}

function InfoRow({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className="
        flex items-center gap-3 px-4 py-3 rounded-2xl
        bg-white/[0.03] border border-white/[0.06]
      "
    >
      <div className="text-white/50">{icon}</div>
      <span className="text-[14px] text-white/80">{label}</span>
    </div>
  );
}

function ServiceRow({
  service,
  colour,
}: {
  service: Service;
  colour: string;
}) {
  return (
    <Link
      href={`/booking/${service.id}`}
      className="
        flex items-center gap-3 p-4 rounded-2xl
        bg-white/[0.03] border border-white/[0.06]
        hover:border-white/[0.14] active:scale-[0.99]
        transition-all
      "
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-white tracking-tight">
          {service.name}
        </h3>
        {service.description && (
          <p className="mt-0.5 text-[13px] text-white/55 line-clamp-1">
            {service.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-white/55">
          <Clock className="w-[12px] h-[12px]" strokeWidth={2} />
          <span>{formatDuration(service.duration_minutes)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div
          className="text-[16px] font-semibold tracking-tight"
          style={{ color: colour }}
        >
          {formatPrice(service.price_cents)}
        </div>
        <div
          className="
            h-7 px-3 rounded-full text-[12px] font-semibold
            flex items-center
          "
          style={{
            backgroundColor: `${colour}1F`,
            color: colour,
            border: `1px solid ${colour}55`,
          }}
        >
          Book
        </div>
      </div>
    </Link>
  );
}
