type SummaryProps = {
  serviceName: string;
  startVoice: string;
  durationMinutes: number;
  city: string | null;
  isFree: boolean;
  priceCents: number;
  isPromoted: boolean;
  originalPriceCents: number | null;
  accent: string;
};

function formatEuros(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toFixed(euros % 1 === 0 ? 0 : 2)}`;
}

// Centerpiece of the page. Slightly elevated dark card with a single
// 4px accent strip down the left edge — the only place the business's
// own colour appears prominently.
export default function BookingSummary({
  serviceName,
  startVoice,
  durationMinutes,
  city,
  isFree,
  priceCents,
  isPromoted,
  originalPriceCents,
  accent,
}: SummaryProps) {
  const meta = [`${durationMinutes} min`, city].filter(Boolean).join(' · ');

  return (
    <section
      style={{
        position: 'relative',
        background: 'var(--ob-co-surface)',
        border: '1px solid var(--ob-co-border-quiet)',
        borderRadius: 12,
        padding: 24,
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          background: accent,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div className="min-w-0">
          <h2
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: '-0.01em',
              color: 'var(--ob-co-text-1)',
              margin: 0,
            }}
          >
            {serviceName}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontWeight: 500,
              fontSize: 17,
              lineHeight: 1.4,
              color: 'var(--ob-co-text-1)',
              margin: '8px 0 0',
            }}
          >
            {startVoice}
          </p>
          {meta ? (
            <p
              style={{
                fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                fontWeight: 400,
                fontSize: 14,
                color: 'var(--ob-co-text-2)',
                margin: '8px 0 0',
              }}
            >
              {meta}
            </p>
          ) : null}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isFree ? (
            <span
              style={{
                fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                fontWeight: 500,
                fontSize: 18,
                color: 'var(--ob-co-gold)',
              }}
            >
              Free
            </span>
          ) : (
            <>
              {isPromoted && originalPriceCents != null ? (
                <div
                  style={{
                    fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                    fontWeight: 400,
                    fontSize: 14,
                    color: 'var(--ob-co-text-3)',
                    textDecoration: 'line-through',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatEuros(originalPriceCents)}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                  fontWeight: 600,
                  fontSize: 22,
                  color: 'var(--ob-co-text-1)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatEuros(priceCents)}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
