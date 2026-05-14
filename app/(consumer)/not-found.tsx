import Link from 'next/link';

export default function ConsumerNotFound() {
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
        Page not found
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
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/home"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          padding: '0 24px',
          borderRadius: 999,
          background: '#D4AF37',
          color: '#080808',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          textDecoration: 'none',
          boxShadow: '0 8px 20px rgba(212,175,55,0.28)',
        }}
      >
        Back to home
      </Link>
    </main>
  );
}
