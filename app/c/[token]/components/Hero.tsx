type HeroBusiness = {
  name: string;
  category: string | null;
  city: string | null;
  tagline: string | null;
  primary_colour: string;
};

function pickAccentForeground(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#0F0F0F' : '#FFFFFF';
}

function humaniseCategory(category: string | null): string | null {
  if (!category) return null;
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Hero({ business }: { business: HeroBusiness }) {
  const initial = (business.name || '?').trim().charAt(0).toUpperCase();
  const fg = pickAccentForeground(business.primary_colour);
  const subtitle =
    business.tagline?.trim() ||
    [humaniseCategory(business.category), business.city].filter(Boolean).join(' · ');

  return (
    <section
      className="flex items-center"
      style={{
        gap: 16,
        maxWidth: 520,
        margin: '48px auto 0',
        padding: '0 24px',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: business.primary_colour,
          color: fg,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontWeight: 600,
          fontSize: 24,
          flexShrink: 0,
          // Soft inner shadow for depth — subtle, off-axis.
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 2px rgba(0,0,0,0.25)',
        }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h1
          style={{
            fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
            fontWeight: 600,
            fontSize: 22,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            color: 'var(--ob-co-text-1)',
            margin: 0,
          }}
        >
          {business.name}
        </h1>
        {subtitle ? (
          <p
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontWeight: 400,
              fontSize: 14,
              lineHeight: 1.4,
              color: 'var(--ob-co-text-2)',
              margin: '4px 0 0',
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
