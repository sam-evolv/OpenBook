'use client';

import { Clock, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  business: any;
  services: any[];
  onBookService: (s: any) => void;
  onOpenGallery: () => void;
  hasGallery: boolean;
}

export function BusinessHome({ business, services, onBookService, onOpenGallery, hasGallery }: Props) {
  const primary = business.primary_colour ?? '#D4AF37';
  const gallery: string[] = business.gallery_urls ?? [];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        {business.hero_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={business.hero_image_url}
            alt={business.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, ${primary}40 0%, #000 70%), linear-gradient(180deg, #111 0%, #000 100%)`,
            }}
          />
        )}

        {/* Gradient overlay for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Name + tagline */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-16">
          {business.city && (
            <p
              className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-2"
              style={{ color: primary }}
            >
              {business.city}
            </p>
          )}
          <h1
            className="text-[34px] font-bold leading-[1] tracking-[-0.02em]"
            style={{ color: '#fff' }}
          >
            {business.name}
          </h1>
          {business.tagline && (
            <p className="mt-2 text-[15px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {business.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Services list */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Services
          </p>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Services coming soon
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => onBookService(svc)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-[15px] font-semibold leading-tight"
                    style={{ color: '#fff' }}
                  >
                    {svc.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Clock
                        className="h-3 w-3"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                        strokeWidth={2}
                      />
                      <span
                        className="text-[12px]"
                        style={{ color: 'rgba(255,255,255,0.55)' }}
                      >
                        {formatDuration(svc.duration_minutes)}
                      </span>
                    </div>
                    {svc.description && (
                      <span
                        className="text-[12px] truncate"
                        style={{ color: 'rgba(255,255,255,0.45)' }}
                      >
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
            <p
              className="text-[11px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
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
            {gallery.slice(0, 4).map((url, i) => (
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
        <div className="px-5 pb-6">
          <p
            className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-3"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            About
          </p>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            {business.about_long}
          </p>
        </div>
      )}
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
