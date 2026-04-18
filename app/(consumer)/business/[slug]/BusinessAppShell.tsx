'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  Clock,
  MapPin,
  Phone,
  Globe,
  ChevronRight,
  Quote,
  Sparkles,
} from 'lucide-react';
import type { Service } from '@/lib/supabase';
import { formatPrice, formatDuration } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import type { BusinessExtended } from './page';

interface Props {
  business: BusinessExtended;
  services: Service[];
}

const SWIPE_THRESHOLD = 120;

export function BusinessAppShell({ business, services }: Props) {
  const router = useRouter();
  const colour = business.primary_colour || '#D4AF37';

  // Swipe-down-to-close gesture
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const scrolledAtStartRef = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    scrolledAtStartRef.current = window.scrollY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current == null) return;
    // Only track downward pull when already at top of scroll
    if (scrolledAtStartRef.current > 0) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      setDragY(Math.min(delta, 280));
    }
  }
  function handleTouchEnd() {
    if (dragY > SWIPE_THRESHOLD) {
      router.push('/home');
    } else {
      setDragY(0);
    }
    startYRef.current = null;
  }

  const dragStyle =
    dragY > 0
      ? {
          transform: `translateY(${dragY}px) scale(${1 - dragY / 2000})`,
          borderRadius: `${Math.min(32, dragY / 4)}px`,
          transition: 'none',
        }
      : {
          transform: 'translateY(0) scale(1)',
          borderRadius: '0px',
          transition:
            'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        };

  const gallery = business.gallery_urls ?? [];
  const team = business.team ?? [];
  const testimonials = business.testimonials ?? [];
  const offers = business.offers ?? [];

  return (
    <>
      {/* Backdrop shows through when pulling down */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          background: 'radial-gradient(800px 500px at 50% 30%, #1a1a1f 0%, #000 80%)',
        }}
      />

      <main
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative min-h-[100dvh] text-white antialiased overflow-hidden"
        style={dragStyle}
      >
        {/* Per-business tinted background */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(1000px 600px at 50% -10%, ${colour}33 0%, transparent 55%),
              linear-gradient(180deg, #060606 0%, #020202 100%)
            `,
          }}
        />

        <ConsumerHeader domain={`${business.slug}.openbook.ie`} />

        <div className="pb-40">
          {/* ————————————————  COVER HERO  ———————————————— */}
          <section className="px-5 pt-2">
            <div
              className="
                relative rounded-[28px] overflow-hidden
                border border-white/[0.08]
                shadow-[0_30px_80px_rgba(0,0,0,0.6)]
              "
            >
              <div className="relative aspect-[16/11] w-full">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Logo badge */}
                {business.logo_url && (
                  <div
                    className="
                      absolute top-4 left-4 w-14 h-14 rounded-[16px] overflow-hidden
                      border border-white/20
                      shadow-[0_8px_24px_rgba(0,0,0,0.5)]
                    "
                    style={{
                      background: `linear-gradient(145deg, ${colour} 0%, ${colour}aa 100%)`,
                    }}
                  >
                    <Image
                      src={business.logo_url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="
                        inline-flex items-center h-[22px] px-2.5 rounded-md
                        text-[11px] font-semibold tracking-wide
                      "
                      style={{
                        backgroundColor: `${colour}22`,
                        color: colour,
                        border: `1px solid ${colour}55`,
                      }}
                    >
                      {business.category}
                    </span>
                    {business.city && (
                      <span className="text-[12px] text-white/60">
                        {business.city}
                      </span>
                    )}
                  </div>
                  <h1 className="text-[30px] font-bold tracking-tight leading-[1.05]">
                    {business.name}
                  </h1>
                  {business.tagline && (
                    <p className="mt-1.5 text-[14px] text-white/70 leading-snug">
                      {business.tagline}
                    </p>
                  )}
                  <div className="mt-2.5 flex items-center gap-2">
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
          </section>

          {/* ————————————————  QUICK ACTIONS  ———————————————— */}
          <section className="px-5 mt-5">
            <div className="grid grid-cols-3 gap-2">
              {business.phone && (
                <ActionPill
                  href={`tel:${business.phone}`}
                  icon={<Phone className="w-4 h-4" />}
                  label="Call"
                  colour={colour}
                />
              )}
              {business.address_line && (
                <ActionPill
                  href={`https://maps.apple.com/?q=${encodeURIComponent(business.address_line)}`}
                  icon={<MapPin className="w-4 h-4" />}
                  label="Map"
                  colour={colour}
                />
              )}
              {business.website && (
                <ActionPill
                  href={business.website}
                  icon={<Globe className="w-4 h-4" />}
                  label="Website"
                  colour={colour}
                />
              )}
            </div>
          </section>

          {/* ————————————————  ABOUT  ———————————————— */}
          {(business.about_long || business.description) && (
            <Section title="About">
              <div
                className="
                  p-5 rounded-[22px]
                  bg-white/[0.03] border border-white/[0.06]
                "
              >
                <p className="text-[15px] leading-relaxed text-white/80 whitespace-pre-wrap">
                  {business.about_long ?? business.description}
                </p>
              </div>
            </Section>
          )}

          {/* ————————————————  OFFERS  ———————————————— */}
          {offers.length > 0 && (
            <Section title="Offers">
              <div className="flex flex-col gap-2.5">
                {offers.map((o, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border"
                    style={{
                      background: `linear-gradient(135deg, ${colour}15 0%, ${colour}04 100%)`,
                      borderColor: `${colour}40`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="
                          w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                          shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]
                        "
                        style={{
                          background: `linear-gradient(145deg, ${colour} 0%, ${colour}99 100%)`,
                        }}
                      >
                        <Sparkles className="w-5 h-5 text-black/75" strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-semibold tracking-tight">
                            {o.title}
                          </h3>
                          {o.badge && (
                            <span
                              className="
                                inline-flex h-[20px] px-2 rounded-md items-center
                                text-[10px] font-bold tracking-wider uppercase
                              "
                              style={{
                                backgroundColor: colour,
                                color: '#000',
                              }}
                            >
                              {o.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[13px] text-white/70 leading-snug">
                          {o.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ————————————————  GALLERY  ———————————————— */}
          {gallery.length > 0 && (
            <Section title="Gallery">
              <div className="overflow-x-auto no-scrollbar -mx-5">
                <div className="flex gap-2.5 px-5 pb-1">
                  {gallery.map((url, i) => (
                    <div
                      key={i}
                      className="
                        relative shrink-0 w-[220px] h-[260px] rounded-2xl overflow-hidden
                        border border-white/[0.06]
                      "
                    >
                      <Image
                        src={url}
                        alt={`${business.name} ${i + 1}`}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ————————————————  SERVICES  ———————————————— */}
          <Section
            title="Services"
            right={
              <span className="text-[12px] text-white/40">
                {services.length} available
              </span>
            }
          >
            {services.length === 0 ? (
              <EmptyBlock label="No services available yet." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {services.map((s) => (
                  <Link
                    key={s.id}
                    href={`/booking/${s.id}`}
                    className="
                      flex items-center gap-3 p-4 rounded-2xl
                      bg-white/[0.03] border border-white/[0.06]
                      hover:border-white/[0.14] active:scale-[0.99] transition-all
                    "
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-white tracking-tight">
                        {s.name}
                      </h3>
                      {s.description && (
                        <p className="mt-0.5 text-[13px] text-white/55 line-clamp-2">
                          {s.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[12px] text-white/55">
                        <Clock className="w-[12px] h-[12px]" strokeWidth={2} />
                        <span>{formatDuration(s.duration_minutes)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div
                        className="text-[16px] font-semibold tracking-tight"
                        style={{ color: colour }}
                      >
                        {formatPrice(s.price_cents)}
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
                ))}
              </div>
            )}
          </Section>

          {/* ————————————————  TEAM  ———————————————— */}
          {team.length > 0 && (
            <Section title="Meet the team">
              <div className="overflow-x-auto no-scrollbar -mx-5">
                <div className="flex gap-3 px-5 pb-1">
                  {team.map((m, i) => (
                    <div
                      key={i}
                      className="
                        shrink-0 w-[140px] p-3 rounded-2xl
                        bg-white/[0.03] border border-white/[0.06]
                        flex flex-col items-center text-center
                      "
                    >
                      <div
                        className="
                          relative w-16 h-16 rounded-full overflow-hidden
                          border border-white/10
                        "
                        style={{
                          background: `linear-gradient(145deg, ${colour} 0%, ${colour}55 100%)`,
                        }}
                      >
                        {m.photo_url ? (
                          <Image
                            src={m.photo_url}
                            alt={m.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white/90 font-bold text-[20px]">
                            {m.name[0]}
                          </div>
                        )}
                      </div>
                      <p className="mt-2.5 text-[13px] font-semibold tracking-tight truncate w-full">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-white/55 mt-0.5 truncate w-full">
                        {m.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ————————————————  TESTIMONIALS  ———————————————— */}
          {testimonials.length > 0 && (
            <Section title="Reviews">
              <div className="overflow-x-auto no-scrollbar -mx-5">
                <div className="flex gap-3 px-5 pb-1">
                  {testimonials.map((t, i) => (
                    <div
                      key={i}
                      className="
                        shrink-0 w-[280px] p-4 rounded-2xl
                        bg-white/[0.03] border border-white/[0.06]
                      "
                    >
                      <Quote
                        className="w-4 h-4 mb-2"
                        style={{ color: colour }}
                        strokeWidth={2}
                      />
                      <p className="text-[13.5px] leading-relaxed text-white/85">
                        "{t.quote}"
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {t.rating && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: t.rating }).map((_, j) => (
                              <Star
                                key={j}
                                className="w-3 h-3"
                                strokeWidth={0}
                                style={{ fill: colour, color: colour }}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-[12px] font-medium text-white/60">
                          — {t.author}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Swipe hint */}
          <p className="mt-10 text-center text-[11px] text-white/25">
            Swipe down or tap × to close
          </p>
        </div>

        <BottomTabBar />
      </main>
    </>
  );
}

/* ——— Sub-components ——— */

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="px-5 mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function ActionPill({
  href,
  icon,
  label,
  colour,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  colour: string;
}) {
  return (
    <a
      href={href}
      className="
        h-11 rounded-2xl flex items-center justify-center gap-2
        bg-white/[0.04] border border-white/[0.08]
        hover:border-white/20 active:scale-95 transition
        text-[13px] font-semibold text-white
      "
    >
      <span style={{ color: colour }}>{icon}</span>
      {label}
    </a>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="py-10 text-center text-white/40 text-[14px]">{label}</div>
  );
}
