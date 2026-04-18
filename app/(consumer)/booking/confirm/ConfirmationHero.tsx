'use client';

import { Check } from 'lucide-react';

export function ConfirmationHero({ colour }: { colour: string }) {
  return (
    <div className="pt-12 flex items-center justify-center">
      <div className="relative">
        {/* Glowing ring */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${colour}66 0%, transparent 70%)`,
            transform: 'scale(1.5)',
          }}
        />
        <div
          className="
            relative w-[96px] h-[96px] rounded-full
            flex items-center justify-center
            shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)]
            animate-scale-in
          "
          style={{
            background: `linear-gradient(145deg, ${colour} 0%, ${colour}88 100%)`,
          }}
        >
          <Check className="w-12 h-12 text-black" strokeWidth={3} />
        </div>
      </div>
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  );
}
