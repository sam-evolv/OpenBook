'use client';

import { useEffect, useState } from 'react';

type Props = {
  expiresAt: string;
  serverNow: string;
};

function humaniseRemaining(ms: number): { text: string; tone: 'quiet' | 'gold' | 'amber' } {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec <= 0) {
    return { text: 'Hold expired', tone: 'amber' };
  }
  if (totalSec < 30) {
    return { text: `Held for ${totalSec} seconds`, tone: 'amber' };
  }
  if (totalSec < 60) {
    return { text: 'Held for under a minute', tone: 'gold' };
  }
  if (totalSec < 120) {
    return { text: 'Held for under 2 minutes', tone: 'gold' };
  }
  // ≥ 2 minutes — round down to whole minutes for stability.
  const minutes = Math.floor(totalSec / 60);
  return { text: `Held for ${minutes} minutes`, tone: 'quiet' };
}

// Top-right slot-hold indicator. Calm by design — no pulsing, no anxious
// per-second tick. Updates every 10s. Tone shifts as the hold approaches
// expiry but the text stays steady.
//
// Hydration: server pre-computes the initial display from
// (expiresAt - serverNow) so SSR and CSR HTML match. Client useEffect then
// re-computes from real wall clock — first repaint may shift by 1-2s,
// which is why suppressHydrationWarning sits on the value span.
export default function Countdown({ expiresAt, serverNow }: Props) {
  const initialMs = Math.max(
    0,
    new Date(expiresAt).getTime() - new Date(serverNow).getTime(),
  );
  const [remaining, setRemaining] = useState(initialMs);

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const { text, tone } = humaniseRemaining(remaining);
  const colour =
    tone === 'amber'
      ? 'var(--ob-co-warn-amber)'
      : tone === 'gold'
        ? 'var(--ob-co-gold-hi)'
        : 'var(--ob-co-text-2)';

  return (
    <div
      role="timer"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
        fontWeight: 400,
        fontSize: 13,
        color: colour,
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 200ms var(--ob-co-ease-out)',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
        <path
          d="M6 3v3l2 1.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span suppressHydrationWarning>{text}</span>
    </div>
  );
}
