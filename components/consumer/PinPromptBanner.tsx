'use client';

/**
 * PinPromptBanner — first-time hint on Explore that explains the "+" pill
 * on every business card. Auto-hides once the user has any pins, and is
 * manually dismissible via the X (the localStorage flag also dismisses
 * it across sessions).
 *
 * Sits below the page header so it never overlaps the search input.
 */

import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';

const DISMISS_KEY = 'pin_prompt_dismissed_v1';

export function PinPromptBanner({ pinsCount }: { pinsCount: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pinsCount > 0) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(DISMISS_KEY) === 'true') return;
    setVisible(true);
  }, [pinsCount]);

  if (!visible) return null;

  function dismiss() {
    haptics.tap();
    window.localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  }

  return (
    <div
      className="mx-5 mb-3 flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 mat-glass-thin animate-reveal-up"
      role="status"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" strokeWidth={2} aria-hidden />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-white/85">
        Tap <span className="font-semibold text-[#D4AF37]">+</span> to add businesses to your home screen.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/50 active:scale-95"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
