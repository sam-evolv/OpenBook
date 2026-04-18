'use client';

import { X, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConsumerHeaderProps {
  /** Show the X close button on the left */
  showClose?: boolean;
  /** Show the stack/layout icon on the right */
  showLayout?: boolean;
  /** Override the domain label shown centre */
  domain?: string;
}

export function ConsumerHeader({
  showClose = true,
  showLayout = true,
  domain = 'openbook.ie',
}: ConsumerHeaderProps) {
  const router = useRouter();

  return (
    <div className="pt-safe">
      <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
        {showClose ? (
          <button
            onClick={() => router.back()}
            className="
              w-9 h-9 rounded-full flex items-center justify-center
              bg-white/[0.06] border border-white/[0.08]
              active:scale-95 transition-transform
            "
            aria-label="Close"
          >
            <X className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[15px] font-medium text-white/90 tracking-tight">
            {domain}
          </span>
          <div className="mt-1 h-[3px] w-8 rounded-full bg-white/25" />
        </div>

        {showLayout ? (
          <button
            className="
              w-9 h-9 rounded-full flex items-center justify-center
              bg-white/[0.06] border border-white/[0.08]
              active:scale-95 transition-transform
            "
            aria-label="Layout"
          >
            <LayoutList className="w-[16px] h-[16px] text-white" strokeWidth={2.2} />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>
    </div>
  );
}
