'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export function AssistantCard() {
  return (
    <Link
      href="/assistant"
      className="
        relative block overflow-hidden rounded-[22px]
        border border-white/[0.08]
        active:scale-[0.99] transition-transform
      "
      style={{
        background:
          'radial-gradient(120% 140% at 100% 0%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.04) 40%, rgba(10,10,10,0.6) 70%)',
      }}
    >
      {/* Sheen */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
        }}
      />

      <div className="relative flex items-center gap-4 p-5">
        <div
          className="
            w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
            shadow-[0_8px_20px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]
          "
          style={{
            background: 'linear-gradient(145deg, #E8C76B 0%, #B8923A 100%)',
          }}
        >
          <Sparkles className="w-[22px] h-[22px] text-black/80" strokeWidth={2.2} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#D4AF37] uppercase">
            OpenBook AI
          </p>
          <h3 className="mt-0.5 text-[17px] font-semibold tracking-tight text-white leading-tight">
            Ask anything, book instantly
          </h3>
        </div>

        <ArrowRight className="w-5 h-5 text-white/60 shrink-0" strokeWidth={2} />
      </div>
    </Link>
  );
}
