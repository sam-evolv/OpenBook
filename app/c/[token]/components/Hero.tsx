type HeroBusiness = {
  name: string;
  category: string | null;
  city: string | null;
  tagline: string | null;
  primary_colour: string;
  logo_url: string | null;
};

function humaniseCategory(category: string | null): string | null {
  if (!category) return null;
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Hero({ business }: { business: HeroBusiness }) {
  const subtitle =
    business.tagline?.trim() ||
    [humaniseCategory(business.category), business.city].filter(Boolean).join(' · ');

  return (
    <section
      className="flex items-center"
      style={{
        gap: 12,
        maxWidth: 520,
        margin: '48px auto 0',
        padding: '0 24px',
      }}
    >
      {business.logo_url ? (
        <img
          src={business.logo_url}
          alt={`${business.name} logo`}
          width={48}
          height={48}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : null}
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
