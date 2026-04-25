'use client';

import { useEffect, useState } from 'react';
import { Clock, ChevronRight, Sparkles, Star } from 'lucide-react';
import { getTileColour } from '@/lib/tile-palette';

interface Props {
  business: any;
  services: any[];
  onBookService: (s: any) => void;
  onOpenGallery: () => void;
  hasGallery: boolean;
}

export function BusinessHome({ business, services, onBookService, onOpenGallery, hasGallery }: Props) {
  const primary = getTileColour(business.primary_colour).mid;
  const gallery: string[] = business.gallery_urls ?? [];
  // hero_image_url is the explicit hero. Fall through cover_image_url and the
  // first gallery photo so any business with photography gets a real hero —
  // the radial-gradient fallback only fires for businesses with zero photos.
  const heroSrc: string | null =
    business.hero_image_url ?? business.cover_image_url ?? gallery[0] ?? null;

  const cheapest = services.length === 0
    ? null
    : services.reduce((min, s) => (s.price_cents < min.price_cents ? s : min), services[0]);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ctaVisible = scrollY > 200 && services.length > 0;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div
        className="relative w-full aspect-[16/10] overflow-hidden ob-hero-enter"
      >
        {heroSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroSrc}
            alt={business.name}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            // scale(1.1) gives parallax room to translate without revealing
            // the bottom edge of the image. iOS Safari ignores
            // background-attachment: fixed, so we drive the offset from JS.
            style={{ transform: `translateY(${scrollY * 0.5}px) scale(1.1)` }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, ${primary}40 0%, #000 70%), linear-gradient(180deg, #111 0%, #000 100%)`,
            }}
          />
        )}

        {/* Softer, longer fade tuned for white-Fraunces-on-photo legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Name + tagline */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-16">
          <BadgeStrip business={business} primary={primary} />
          <h1
            className="font-serif text-[38px] font-semibold leading-[1.02] tracking-[-0.02em] text-white"
          >
            {business.name}
          </h1>
          {business.tagline && (
            <p className="mt-2 text-[15px] text-white/80">
              {business.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Services list */}
      <div className="px-5 pt-8 pb-6">
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
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <Sparkles
              className="mx-auto mb-3 h-6 w-6"
              style={{ color: primary }}
              strokeWidth={1.6}
            />
            <p className="text-[14px] text-white/70">
              Services coming soon
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((svc, i) => (
              <button
                key={svc.id}
                onClick={() => onBookService(svc)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-transform duration-100 active:scale-[0.985] animate-reveal-up"
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
                  <h3 className="font-serif text-[17px] font-medium leading-tight text-white">
                    {svc.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Clock
                        className="h-3 w-3 text-white/40"
                        strokeWidth={2}
                      />
                      <span className="text-[12px] text-white/55">
                        {formatDuration(svc.duration_minutes)}
                      </span>
                    </div>
                    {svc.description && (
                      <span className="text-[12px] truncate text-white/45">
                        {svc.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end">
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
        <div className="px-5 pb-6">
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
          <div className="grid grid-cols-2 gap-2">
            {gallery.slice(0, 4).map((url) => (
              <button
                key={url}
                onClick={onOpenGallery}
                className="relative aspect-square rounded-xl overflow-hidden"
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
          className="px-5 pb-6 animate-reveal-up"
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

      {/* Sticky Book CTA — appears once the hero has scrolled mostly out of
          frame. Sits above the BusinessAppShell tab bar (~80px + safe-area).
          Uses .mat-glass-thick to match the BottomTabBar glass treatment. */}
      {cheapest && (
        <button
          onClick={() => onBookService(cheapest)}
          className="mat-glass-thick fixed left-4 right-4 z-40 mx-auto max-w-md rounded-full px-6 py-3.5 flex items-center justify-center gap-2 text-[15px] font-semibold text-white transition-all duration-[250ms] active:scale-[0.98]"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)',
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? 'translateY(0)' : 'translateY(20px)',
            pointerEvents: ctaVisible ? 'auto' : 'none',
          }}
          aria-label={`Book ${cheapest.name}`}
        >
          <span>Book</span>
          <span className="text-white/50">·</span>
          <span style={{ color: primary }}>
            {cheapest.price_cents === 0 ? 'Free' : `€${(cheapest.price_cents / 100).toFixed(0)}`}
          </span>
        </button>
      )}
    </div>
  );
}

function BadgeStrip({ business, primary }: { business: any; primary: string }) {
  const parts: Array<{ key: string; node: React.ReactNode }> = [];
  if (business.city) {
    parts.push({ key: 'city', node: business.city });
  }
  if (business.category) {
    parts.push({
      key: 'category',
      node: business.category.replace(/_/g, ' '),
    });
  }
  if (typeof business.rating === 'number' && business.rating > 0) {
    parts.push({
      key: 'rating',
      node: (
        <span className="inline-flex items-center gap-1">
          <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
          {business.rating.toFixed(1)}
        </span>
      ),
    });
  }
  if (parts.length === 0) return null;
  return (
    <div
      className="flex items-center gap-2 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase"
      style={{ color: primary }}
    >
      {parts.map((p, i) => (
        <span key={p.key} className="flex items-center gap-2">
          {i > 0 && <span className="text-white/30">·</span>}
          <span>{p.node}</span>
        </span>
      ))}
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
