'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  business: any;
}

export function BusinessGallery({ business }: Props) {
  const gallery: string[] = business.gallery_urls ?? [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (gallery.length === 0) {
    return (
      <div className="pt-20 px-5 text-center">
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>No photos yet.</p>
      </div>
    );
  }

  return (
    <div className="pt-20 px-3 pb-6">
      <div className="grid grid-cols-2 gap-1.5">
        {gallery.map((url, i) => (
          <button
            key={url}
            onClick={() => setActiveIndex(i)}
            className="relative aspect-square rounded-xl overflow-hidden active:scale-[0.99] transition-transform"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
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
