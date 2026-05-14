import Link from 'next/link';

export default function MarketingNotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#080808',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontWeight: 500,
          fontSize: 44,
          letterSpacing: '-0.02em',
          color: '#ffffff',
        }}
      >
        Nothing here yet.
      </h1>
      <p
        style={{
          margin: '12px 0 32px',
          fontSize: 16,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.6)',
          maxWidth: 380,
        }}
      >
        This site isn't published or the address is wrong.
      </p>
      <Link
        href="https://openbook.ie"
        style={{
          fontSize: 13,
          color: '#D4AF37',
          letterSpacing: '0.04em',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Powered by OpenBook →
      </Link>
    </main>
  );
}
