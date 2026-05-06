'use client';

import { useEffect, useState } from 'react';
import { Clock, ChevronRight, Sparkles, Star, MapPin, ImageIcon, CircleCheck } from 'lucide-react';
import { getBusinessOpenness, type BusinessHourRow } from '@/lib/business-hours';
import { heroForBusiness } from '@/lib/categories';
import { getTileColour } from '@/lib/tile-palette';

interface Props {
  business: any;
  services: any[];
  hours: BusinessHourRow[];
  onBookService: (s: any) => void;
  onOpenGallery: () => void;
  hasGallery: boolean;
}

export function BusinessHome({ business, services, hours, onBookService, onOpenGallery, hasGallery }: Props) {
  const primary = getTileColour(business.primary_colour).mid;
  const gallery: string[] = business.gallery_urls ?? [];
  const uploadedHeroSrc: string | null =
    business.hero_image_url ?? business.cover_image_url ?? gallery[0] ?? null;
  const heroSrc = uploadedHeroSrc ?? heroForBusiness(business.slug ?? business.id ?? business.name, business.category);
  const openness = getBusinessOpenness(hours, business.business_closures ?? []);

  const cheapest = services.length === 0
    ? null
    : services.reduce((min, s) => (s.price_cents < min.price_cents ? s : min), services[0]);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero — `isolate` so the parallax-transformed image stays under the
          overlays (transformed elements create stacking contexts and could
          otherwise paint over siblings on iOS Safari). max-h caps the hero
          on tall desktop viewports so the name + CTA stay above the fold. */}
      <div
        className="relative w-full min-h-[70svh] max-h-[780px] overflow-hidden isolate ob-hero-enter"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc}
          alt={business.name}
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          style={{
            transform: `translateY(${scrollY * 0.5}px) scale(1.1)`,
            zIndex: 0,
            opacity: uploadedHeroSrc ? 1 : 0.58,
            filter: uploadedHeroSrc ? 'none' : 'saturate(0.82) contrast(1.08)',
          }}
        />

        {!uploadedHeroSrc && (
          <div
            aria-hidden
            className="absolute inset-0 z-[1]"
            style={{
              background: `radial-gradient(circle at 50% 32%, ${primary}55 0%, transparent 34%), linear-gradient(160deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.82) 64%, #000 100%)`,
            }}
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 z-10 pointer-events-none opacity-[0.18] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' seed='12'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* Stronger, longer bottom fade so the name + CTA are legible above
            the fold regardless of which photo lands behind them. */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.08) 24%, rgba(0,0,0,0.66) 68%, rgba(0,0,0,0.98) 100%)',
          }}
        />

        {!uploadedHeroSrc && (
          <div className="absolute inset-x-0 top-[18svh] z-20 flex justify-center">
            <div className="scale-[1.26] opacity-95">
              <BusinessAvatar business={business} primary={primary} />
            </div>
          </div>
        )}

        {/* Name + meta + Book CTA — overlaid on the hero so the customer
            can see what the business is and act on it without scrolling. */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-5 pt-24">
          <div className="mb-4 flex items-end gap-3">
            <BusinessAvatar business={business} primary={primary} />
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/55">
                {uploadedHeroSrc ? 'Book direct' : 'Private booking app'}
              </p>
              {business.city && (
                <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-white/68">
                  <MapPin className="h-3 w-3" strokeWidth={2} />
                  {business.city}
                </p>
              )}
            </div>
          </div>
          <h1
            className="font-serif text-[44px] font-semibold leading-[0.95] tracking-[-0.035em] text-white"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
          >
            {business.name}
          </h1>
          <HeroMeta business={business} />
          {business.tagline && (
            <p
              className="mt-2 text-[14px] text-white/80"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
            >
              {business.tagline}
            </p>
          )}
          {cheapest && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => onBookService(cheapest)}
                className="flex h-12 flex-1 items-center justify-center rounded-full px-6 text-[14px] font-semibold tracking-tight text-black transition-transform active:scale-[0.97]"
                style={{
                  background:
                    'linear-gradient(180deg, #F6D77C 0%, #D4AF37 100%)',
                  boxShadow:
                    '0 1px 0 rgba(255,255,255,0.4) inset, 0 6px 16px rgba(212,175,55,0.35), 0 2px 6px rgba(0,0,0,0.35)',
                }}
                aria-label={`Book ${cheapest.name}`}
              >
                Book from {cheapest.price_cents === 0 ? 'Free' : `€${(cheapest.price_cents / 100).toFixed(0)}`}
              </button>
              {hasGallery && (
                <button
                  onClick={onOpenGallery}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full mat-glass-thin text-white active:scale-[0.97]"
                  aria-label="Open gallery"
                >
                  <ImageIcon className="h-5 w-5" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AtAGlance business={business} services={services} primary={primary} />
      <StorefrontSignal business={business} openness={openness} primary={primary} />

      {/* Services list */}
      <div className="px-5 pt-9 pb-7">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/50">
            Services
          </p>
          <span className="text-[11px] text-white/40">
            {services.length} available
          </span>
        </div>

        {services.length === 0 ? (
          <div
            className="rounded-[26px] p-8 text-center"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)',
              border: '0.5px solid rgba(255,255,255,0.10)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 32px rgba(0,0,0,0.24)',
            }}
          >
            <Sparkles
              className="mx-auto mb-3 h-6 w-6"
              style={{ color: primary }}
              strokeWidth={1.6}
            />
            <p className="text-[14px] text-white/70">
              Services are being prepared
            </p>
            <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/42">
              New bookable options will appear here as soon as they are ready.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((svc, i) => (
              <button
                key={svc.id}
                onClick={() => onBookService(svc)}
                className="flex items-center gap-3 rounded-[22px] p-4 text-left transition-transform duration-100 active:scale-[0.985] animate-reveal-up"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)',
                  animationDelay: `${200 + i * 60}ms`,
                  animationDuration: '400ms',
                  animationFillMode: 'both',
                }}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-[19px] font-medium leading-tight text-white">
                    {svc.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Clock
                        className="h-3 w-3 text-white/40"
                        strokeWidth={2}
                      />
                      <span className="text-[12px] text-white/58">
                        {formatDuration(svc.duration_minutes)}
                      </span>
                    </div>
                    {svc.description && (
                      <span className="text-[12px] truncate text-white/48">
                        {svc.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span
                    className="text-[16px] font-semibold tabular-nums"
                    style={{ color: primary }}
                  >
                    {svc.price_cents === 0 ? 'Free' : `€${(svc.price_cents / 100).toFixed(0)}`}
                  </span>
                  <div
                    className="flex items-center gap-0.5 mt-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: `${primary}22`,
                      color: primary,
                    }}
                  >
                    Book
                    <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gallery preview (first 4 only) */}
      {hasGallery && (
        <div className="px-5 pb-7">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/50">
              Gallery
            </p>
            <button
              onClick={onOpenGallery}
              className="text-[11px] font-semibold"
              style={{ color: primary }}
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-4 grid-rows-2 gap-2">
            {gallery.slice(0, 4).map((url) => (
              <button
                key={url}
                onClick={onOpenGallery}
                className="relative aspect-square overflow-hidden rounded-[18px] first:col-span-2 first:row-span-2 first:aspect-auto active:scale-[0.99] transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* About snippet */}
      {business.about_long && (
        <div
          className="px-5 pb-14 animate-reveal-up"
          style={{ animationDelay: '800ms', animationDuration: '500ms', animationFillMode: 'both' }}
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-3 text-white/50">
            About
          </p>
          <p className="text-[14px] leading-relaxed text-white/75">
            {business.about_long}
          </p>
        </div>
      )}
    </div>
  );
}

function StorefrontSignal({
  business,
  openness,
  primary,
}: {
  business: any;
  openness: ReturnType<typeof getBusinessOpenness>;
  primary: string;
}) {
  const statusColour =
    openness.status === 'open'
      ? '#7BE495'
      : openness.status === 'opens-soon'
        ? '#F6D77C'
        : 'rgba(255,255,255,0.42)';

  return (
    <section className="px-5 pt-5">
      <div
        className="flex items-center gap-3 rounded-[24px] px-4 py-3.5"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)',
          border: '0.5px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 28px rgba(0,0,0,0.22)',
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${primary}20` }}
        >
          <CircleCheck className="h-5 w-5" style={{ color: primary }} strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white/88">
            Direct with {business.name}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-white/48">
            {business.tagline ||
              [business.category, business.city].filter(Boolean).join(' · ') ||
              'Book straight from this page.'}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            color: statusColour,
            background: 'rgba(255,255,255,0.045)',
          }}
        >
          {openness.label}
        </span>
      </div>
    </section>
  );
}

function HeroMeta({ business }: { business: any }) {
  const hasCategory = Boolean(business.category);
  const hasCity = Boolean(business.city);
  const hasRating =
    typeof business.rating === 'number' && business.rating > 0;
  if (!hasCategory && !hasCity && !hasRating) return null;
  return (
    <div className="mt-2 flex items-center gap-2 text-[13px] text-white/80">
      {hasCategory && (
        <span className="capitalize">
          {String(business.category).replace(/_/g, ' ')}
        </span>
      )}
      {hasCategory && hasCity && <span className="text-white/35">·</span>}
      {hasCity && <span>{business.city}</span>}
      {(hasCategory || hasCity) && hasRating && (
        <span className="text-white/35">·</span>
      )}
      {hasRating && (
        <span className="inline-flex items-center gap-1 font-semibold">
          <Star
            className="h-3 w-3 fill-current"
            strokeWidth={0}
            style={{ color: '#F6D77C' }}
          />
          {business.rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function BusinessAvatar({ business, primary }: { business: any; primary: string }) {
  const logo = business.processed_icon_url ?? business.logo_url ?? null;
  const initial = business.name?.trim()?.[0]?.toUpperCase() ?? 'O';
  return (
    <div
      className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-[22px]"
      style={{
        background: `radial-gradient(circle at 30% 18%, #fff8 0%, transparent 24%), linear-gradient(145deg, ${primary} 0%, #111 100%)`,
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.28) inset, 0 18px 40px rgba(0,0,0,0.48)',
      }}
    >
      {logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logo} alt="" className="h-[58%] w-[58%] object-contain drop-shadow" />
      ) : (
        <span className="font-serif text-[36px] font-semibold leading-none text-white drop-shadow">
          {initial}
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/15" />
    </div>
  );
}

function AtAGlance({
  business,
  services,
  primary,
}: {
  business: any;
  services: any[];
  primary: string;
}) {
  const cheapest = services.length
    ? services.reduce((min, s) => (s.price_cents < min.price_cents ? s : min), services[0])
    : null;
  const firstDuration = services[0]?.duration_minutes ?? null;
  const items = [
    business.category
      ? { label: 'Style', value: String(business.category).replace(/_/g, ' ') }
      : null,
    cheapest
      ? {
          label: 'From',
          value: cheapest.price_cents === 0 ? 'Free' : `€${(cheapest.price_cents / 100).toFixed(0)}`,
        }
      : null,
    firstDuration ? { label: 'Time', value: formatDuration(firstDuration) } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (items.length === 0) return null;

  return (
    <section className="-mt-5 px-5 relative z-20">
      <div className="grid grid-cols-3 gap-2 rounded-[24px] p-2 mat-glass-thick">
        {items.map((item) => (
          <div key={item.label} className="rounded-[18px] bg-white/[0.035] px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {item.label}
            </p>
            <p
              className="mt-1 truncate text-[13px] font-semibold capitalize"
              style={{ color: primary }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
