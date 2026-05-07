// Skeleton mirrors the ready-state layout. Visible only briefly — the
// page fetches a single Supabase round-trip server-side.

export default function CheckoutLoading() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        padding: '0 24px 48px',
        background: '#fff',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64, padding: '20px 0' }}>
        <Block width={40} height={40} radius={10} />
        <Block width={140} height={18} />
      </header>
      <Block width="60%" height={26} style={{ marginTop: 8 }} />
      <Block width="80%" height={20} style={{ marginTop: 12 }} />
      <Block width="40%" height={32} style={{ marginTop: 24 }} />
      <hr style={{ border: 0, borderTop: '1px solid rgba(0,0,0,0.08)', margin: '24px 0' }} />
      <div style={{ display: 'grid', gap: 20 }}>
        <Block height={56} radius={12} />
        <Block height={56} radius={12} />
        <Block height={56} radius={12} />
        <Block height={56} radius={14} style={{ marginTop: 8 }} />
      </div>
    </main>
  );
}

function Block({
  width = '100%',
  height,
  radius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #f0f0f3 0%, #e6e6ea 50%, #f0f0f3 100%)',
        backgroundSize: '200% 100%',
        animation: 'ob-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}
