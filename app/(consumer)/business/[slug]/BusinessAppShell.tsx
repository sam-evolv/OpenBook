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
  Quote,
  Sparkles,
} from 'lucide-react';
import type { Service } from '@/lib/supabase';
import { formatPrice, formatDuration } from '@/lib/supabase';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { resolveCategory, CATEGORIES } from '@/lib/categories';
import type { BusinessExtended } from './page';

interface Props {
  business: BusinessExtended;
  services: Service[];
}

const SWIPE_THRESHOLD = 120;

export function BusinessAppShell({ business, services }: Props) {
  const router = useRouter();
  const colour = business.primary_colour || '#D4AF37';
  const categoryKey = resolveCategory(business.category);
  const CategoryIcon = CATEGORIES[categoryKey].icon;

  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const scrolledAtStartRef = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    scrolledAtStartRef.current = window.scrollY;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (startYRef.current == null || scrolledAtStartRef.current > 0) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setDragY(Math.min(delta, 280));
  }
  function handleTouchEnd() {
    if (dragY > SWIPE_THRESHOLD) router.push('/home');
    else setDragY(0);
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
            'transform 320ms var(--ease-apple), border-radius 320ms var(--ease-apple)',
        };

  const gallery = business.gallery_urls ?? [];
  const team = business.team ?? [];
  const testimonials = business.testimonials ?? [];
  const offers = business.offers ?? [];

  return (
    <>
      <div className="fixed inset-0 -z-20 bg-black" />

      <main
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative min-h-[100dvh] overflow-hidden text-white"
        style={dragStyle}
      >
        {/* Tinted atmospheric wallpaper */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(1200px 700px at 50% -10%, ${colour}22 0%, transparent 55%),
              linear-gradient(180deg, #050505 0%, #000 100%)
            `,
          }}
        />
        <div
          aria-hidden
          className="fixed inset-0 -z-10 opacity-[0.035] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='5'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          }}
        />

        <ConsumerHeader domain={`${business.slug}.openbook.ie`} />

        <div className="pb-44">
          {/* ——————— COVER ——————— */}
          <section className="px-5 pt-2 animate-reveal-up">
            <div
              className="relative overflow-hidden rounded-[28px] hairline"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div className="relative aspect-[16/11] w-full">
                <Image
                  src={business.cover_image_url!}
                  alt={business.name}
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover"
                />
                {/* Rich vignette + colour-wash, NOT a flat black gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `
                      linear-gradient(180deg, transparent 0%, transparent 40%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.95) 100%),
                      radial-gradient(ellipse at 50% 110%, ${colour}14 0%, transparent 60%)
                    `,
                  }}
                />

                {/* Category badge — top right */}
                <div className="absolute top-4 right-4">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mat-glass-thin"
                    style={{ color: 'rgba(255,255,255,0.88)' }}
                  >
                    <CategoryIcon className="w-3 h-3" strokeWidth={2} />
                    {business.category}
                  </div>
                </div>

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6">
                  {business.city && (
                    <p
                      className="text-caption-eyebrow mb-2"
                      style={{ color: colour }}
                    >
                      {business.city}
                    </p>
                  )}
                  <h1
                    className="text-display leading-[0.95]"
                    style={{ fontSize: '34px' }}
                  >
                    {business.name}
                  </h1>
                  {business.tagline && (
                    <p
                      className="mt-2 text-[15px] leading-snug max-w-[28ch]"
                      style={{ color: 'rgba(255,255,255,0.78)' }}
                    >
                      {business.tagline}
                    </p>
                  )}
                  <div
                    className="mt-3 flex items-center gap-2 text-[13px] font-medium"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    <Star
                      className="w-[13px] h-[13px]"
                      strokeWidth={0}
                      style={{ fill: colour, color: colour }}
                    />
                    {(business.rating ?? 5).toFixed(1)}
                    <span style={{ color: 'var(--label-4)' }}>·</span>
                    {'€'.repeat(Math.min(4, Math.max(1, business.price_tier ?? 2)))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ——————— QUICK ACTIONS ——————— */}
          {(business.phone || business.address_line || business.website) && (
            <section className="px-5 mt-4 animate-reveal-up" style={{ animationDelay: '80ms' }}>
              <div className="grid grid-cols-3 gap-2">
                {business.phone && (
                  <ActionPill
                    href={`tel:${business.phone}`}
                    icon={<Phone className="w-[15px] h-[15px]" strokeWidth={2} />}
                    label="Call"
                    colour={colour}
                  />
                )}
                {business.address_line && (
                  <ActionPill
                    href={`https://maps.apple.com/?q=${encodeURIComponent(business.address_line)}`}
                    icon={<MapPin className="w-[15px] h-[15px]" strokeWidth={2} />}
                    label="Directions"
                    colour={colour}
                  />
                )}
                {business.website && (
                  <ActionPill
                    href={business.website}
                    icon={<Globe className="w-[15px] h-[15px]" strokeWidth={2} />}
                    label="Website"
                    colour={colour}
                  />
                )}
              </div>
            </section>
          )}

          {/* ——————— ABOUT ——————— */}
          {(business.about_long || business.description) && (
            <Section title="About">
              <div className="p-5 rounded-[22px] mat-card">
                <p
                  className="text-[15px] leading-[1.6] whitespace-pre-wrap"
                  style={{ color: 'rgba(255,255,255,0.82)', letterSpacing: '-0.005em' }}
                >
                  {business.about_long ?? business.description}
                </p>
              </div>
            </Section>
          )}

          {/* ——————— OFFERS ——————— */}
          {offers.length > 0 && (
            <Section title="Offers">
              <div className="flex flex-col gap-2.5">
                {offers.map((o, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-[20px] hairline relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${colour}18 0%, ${colour}04 100%)`,
                      borderColor: `${colour}44`,
                    }}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 40%)',
                      }}
                    />
                    <div className="relative flex items-start gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{
                          background: `radial-gradient(ellipse at 30% 20%, ${colour} 0%, ${darken(colour, 35)} 100%)`,
                          boxShadow: `0 6px 16px ${colour}40, inset 0 1px 0 rgba(255,255,255,0.25)`,
                        }}
                      >
                        <Sparkles className="w-5 h-5" style={{ color: 'rgba(0,0,0,0.78)' }} strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-title text-[15px]">
                            {o.title}
                          </h3>
                          {o.badge && (
                            <span
                              className="inline-flex h-5 px-2 rounded-md items-center text-[10px] font-bold tracking-wider uppercase"
                              style={{
                                backgroundColor: colour,
                                color: '#000',
                              }}
                            >
                              {o.badge}
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-1 text-[13px] leading-snug"
                          style={{ color: 'rgba(255,255,255,0.72)' }}
                        >
                          {o.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ——————— GALLERY ——————— */}
          {gallery.length > 0 && (
            <Section title="Gallery">
              <div className="-mx-5 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 px-5 pb-1">
                  {gallery.map((url, i) => (
                    <div
                      key={i}
                      className="relative shrink-0 w-[240px] h-[300px] rounded-[22px] overflow-hidden hairline"
                      style={{
                        borderColor: 'rgba(255,255,255,0.08)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                      }}
                    >
                      <Image
                        src={url}
                        alt={`${business.name} ${i + 1}`}
                        fill
                        sizes="240px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ——————— SERVICES ——————— */}
          <Section
            title="Services"
            right={
              <span
                className="text-[12px] font-medium"
                style={{ color: 'var(--label-3)' }}
              >
                {services.length} available
              </span>
            }
          >
            {services.length === 0 ? (
              <EmptyBlock label="No services available yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {services.map((s) => (
                  <Link
                    key={s.id}
                    href={`/booking/${s.id}`}
                    className="group flex items-center gap-3 p-4 rounded-[18px] mat-card hover:mat-card-elevated transition-all active:scale-[0.99]"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-title text-[15px]">{s.name}</h3>
                      {s.description && (
                        <p
                          className="mt-0.5 text-[13px] line-clamp-2 leading-snug"
                          style={{ color: 'var(--label-2)' }}
                        >
                          {s.description}
                        </p>
                      )}
                      <div
                        className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium"
                        style={{ color: 'var(--label-3)' }}
                      >
                        <Clock className="w-[12px] h-[12px]" strokeWidth={2} />
                        {formatDuration(s.duration_minutes)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div
                        className="text-title text-[17px]"
                        style={{ color: colour }}
                      >
                        {formatPrice(s.price_cents)}
                      </div>
                      <div
                        className="h-7 px-3.5 rounded-full text-[12px] font-semibold flex items-center transition-transform group-hover:scale-105"
                        style={{
                          background: `linear-gradient(145deg, ${colour} 0%, ${darken(colour, 20)} 100%)`,
                          color: '#000',
                          boxShadow: `0 4px 12px ${colour}40`,
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

          {/* ——————— TEAM ——————— */}
          {team.length > 0 && (
            <Section title="Meet the team">
              <div className="-mx-5 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 px-5 pb-1">
                  {team.map((m, i) => (
                    <div
                      key={i}
                      className="shrink-0 w-[148px] p-4 rounded-[22px] mat-card flex flex-col items-center text-center"
                    >
                      <div
                        className="relative w-[72px] h-[72px] rounded-full overflow-hidden"
                        style={{
                          background: `radial-gradient(ellipse at 30% 20%, ${colour} 0%, ${colour}66 100%)`,
                          boxShadow: `0 8px 20px ${colour}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
                        }}
                      >
                        {m.photo_url ? (
                          <Image src={m.photo_url} alt={m.name} fill sizes="72px" className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[22px]">
                            {m.name[0]}
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-[13px] font-semibold truncate w-full" style={{ letterSpacing: '-0.01em' }}>
                        {m.name}
                      </p>
                      <p className="mt-0.5 text-[11px] truncate w-full" style={{ color: 'var(--label-3)' }}>
                        {m.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ——————— TESTIMONIALS ——————— */}
          {testimonials.length > 0 && (
            <Section title="Reviews">
              <div className="-mx-5 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 px-5 pb-1">
                  {testimonials.map((t, i) => (
                    <div
                      key={i}
                      className="shrink-0 w-[300px] p-5 rounded-[22px] mat-card-elevated"
                    >
                      <Quote className="w-5 h-5 mb-3" style={{ color: colour }} strokeWidth={2} />
                      <p
                        className="text-[14px] leading-[1.55]"
                        style={{ color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.005em' }}
                      >
                        {t.quote}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
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
                        <p className="text-[12px] font-medium" style={{ color: 'var(--label-2)' }}>
                          {t.author}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          <p
            className="mt-10 text-center text-[11px]"
            style={{ color: 'var(--label-4)' }}
          >
            Swipe down or tap × to close
          </p>
        </div>

        <BottomTabBar />
      </main>
    </>
  );
}

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
    <section className="px-5 mt-8 animate-reveal-up" style={{ animationDelay: '120ms' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-caption-eyebrow" style={{ color: 'var(--label-3)' }}>
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
      className="h-11 rounded-full mat-card flex items-center justify-center gap-2 transition-transform active:scale-95 hover:mat-card-elevated"
    >
      <span style={{ color: colour }}>{icon}</span>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--label-1)' }}>
        {label}
      </span>
    </a>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div
      className="py-10 text-center text-[14px]"
      style={{ color: 'var(--label-3)' }}
    >
      {label}
    </div>
  );
}

function darken(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  const factor = 1 - percent / 100;
  return `#${[(num >> 16) & 255, (num >> 8) & 255, num & 255]
    .map((v) => Math.max(0, Math.floor(v * factor)).toString(16).padStart(2, '0'))
    .join('')}`;
}
