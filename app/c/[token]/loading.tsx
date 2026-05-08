// Skeleton mirrors the ready-state layout. Visible only briefly — the page
// fetches a single Supabase round-trip server-side. Dark-themed to match
// the redesigned checkout; uses the .ob-co-skeleton pulse from globals.css
// (no spinner, just calm shimmer).

export default function CheckoutLoading() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--ob-co-bg)',
        color: 'var(--ob-co-text-1)',
      }}
    >
      <header
        style={{
          height: 64,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--ob-co-border-quiet)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
            fontWeight: 600,
            fontSize: 16,
            color: 'var(--ob-co-gold)',
            letterSpacing: '-0.01em',
          }}
        >
          OpenBook
        </span>
        <div className="ob-co-skeleton" style={{ width: 110, height: 14, borderRadius: 999 }} />
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 520,
          margin: '48px auto 0',
          padding: '0 24px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div className="ob-co-skeleton" style={{ width: 56, height: 56, borderRadius: 8 }} />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          <div className="ob-co-skeleton" style={{ height: 20, width: '60%' }} />
          <div className="ob-co-skeleton" style={{ height: 14, width: '40%' }} />
        </div>
      </section>

      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          padding: '32px 24px 48px',
          display: 'grid',
          gap: 32,
        }}
      >
        {/* Booking summary card */}
        <div
          className="ob-co-skeleton"
          style={{ height: 130, borderRadius: 12 }}
        />

        {/* Form fields */}
        <div style={{ display: 'grid', gap: 16 }}>
          <Block height={56} />
          <Block height={56} />
          <Block height={56} />
          <Block height={120} />
        </div>

        {/* CTA */}
        <div className="ob-co-skeleton" style={{ height: 56, borderRadius: 12 }} />
      </div>
    </main>
  );
}

function Block({ height }: { height: number }) {
  return <div className="ob-co-skeleton" style={{ height, borderRadius: 8 }} />;
}
