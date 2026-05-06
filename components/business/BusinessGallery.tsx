'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { getTileColour } from '@/lib/tile-palette';

interface Props {
  business: any;
}

export function BusinessGallery({ business }: Props) {
  const gallery: string[] = business.gallery_urls ?? [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const primary = getTileColour(business.primary_colour).mid;

  if (gallery.length === 0) {
    return (
      <div className="px-5 pt-[calc(82px+env(safe-area-inset-top))] text-center">
        <div
          className="rounded-[28px] px-6 py-10"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)',
            border: '0.5px solid rgba(255,255,255,0.10)',
          }}
        >
          <ImageIcon className="mx-auto mb-3 h-7 w-7" style={{ color: primary }} strokeWidth={1.7} />
          <p className="text-[15px] font-semibold text-white/82">Gallery coming soon</p>
          <p className="mx-auto mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/45">
            Photos from {business.name} will appear here soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-8 pt-[calc(78px+env(safe-area-inset-top))]">
      <div className="px-2 pb-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: primary }}
        >
          Gallery
        </p>
        <h1 className="mt-1 font-serif text-[34px] font-semibold leading-none tracking-[-0.025em]">
          {business.name}
        </h1>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {gallery.map((url, i) => (
          <button
            key={url}
            onClick={() => setActiveIndex(i)}
            className="relative aspect-square overflow-hidden rounded-[24px] active:scale-[0.99] transition-transform first:col-span-2 first:aspect-[1.35]"
            style={{
              boxShadow: '0 14px 36px rgba(0,0,0,0.30)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="pointer-events-none absolute inset-0 border border-white/10 rounded-[24px]" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
          onClick={() => setActiveIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(null);
            }}
            className="absolute top-[calc(16px+env(safe-area-inset-top))] right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {activeIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(activeIndex - 1);
              }}
              className="absolute left-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}

          {activeIndex < gallery.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(activeIndex + 1);
              }}
              className="absolute right-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery[activeIndex]}
            alt=""
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div
            className="absolute bottom-[calc(20px+env(safe-area-inset-bottom))] left-0 right-0 text-center text-[12px]"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {activeIndex + 1} / {gallery.length}
          </div>
        </div>
      )}
    </div>
  );
}
