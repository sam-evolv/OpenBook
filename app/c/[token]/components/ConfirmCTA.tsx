'use client';

import type { CSSProperties } from 'react';

type Props = {
  isFree: boolean;
  priceCents: number;
  isProcessing: boolean;
  disabled: boolean;
  tryAgain?: boolean;
};

function formatEuros(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toFixed(euros % 1 === 0 ? 0 : 2)}`;
}

const baseStyle: CSSProperties = {
  appearance: 'none',
  width: '100%',
  height: 56,
  borderRadius: 12,
  border: 'none',
  background: 'var(--ob-co-gold)',
  color: '#080808',
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontWeight: 600,
  fontSize: 16,
  letterSpacing: '-0.005em',
  fontVariantNumeric: 'tabular-nums',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
  transition: 'background-color 200ms var(--ob-co-ease-out), transform 50ms ease-out',
};

// The most considered button on the page.
//   - Idle:     gold, near-black text.
//   - Hover:    background → gold-highlight (handled via :hover styles below).
//   - Press:    scale 0.98 for 50ms (handled via :active).
//   - Loading:  gold-shadow + spinner + "Confirming…"; loading takes
//               precedence over the standard disabled styling.
export default function ConfirmCTA({ isFree, priceCents, isProcessing, disabled, tryAgain }: Props) {
  const label = tryAgain
    ? 'Try again.'
    : isFree
      ? 'Confirm Booking'
      : (
        <>
          Pay {formatEuros(priceCents)}
          <span style={{ color: 'rgba(8,8,8,0.55)', margin: '0 4px' }}>·</span>
          Confirm
        </>
      );

  const style: CSSProperties = isProcessing
    ? { ...baseStyle, background: 'var(--ob-co-gold-lo)', cursor: 'progress' }
    : disabled
      ? { ...baseStyle, opacity: 0.55, cursor: 'not-allowed' }
      : baseStyle;

  return (
    <button
      type="submit"
      className="ob-co-cta"
      disabled={disabled || isProcessing}
      aria-busy={isProcessing || undefined}
      style={style}
    >
      {isProcessing ? (
        <>
          <Spinner />
          <span>Confirming…</span>
        </>
      ) : (
        <span>{label}</span>
      )}
      <style>{`
        .ob-co-cta:not(:disabled):hover { background: var(--ob-co-gold-hi); }
        .ob-co-cta:not(:disabled):active { transform: scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          .ob-co-cta { transition: none; }
          .ob-co-cta:active { transform: none; }
        }
      `}</style>
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: '2px solid #080808',
        borderTopColor: 'transparent',
        animation: 'ob-co-spin 0.8s linear infinite',
        display: 'inline-block',
      }}
    />
  );
}
