import type { ReactNode } from 'react';

// Minimal 64px top bar. Wordmark left, slot-held countdown right.
// The wordmark is OpenBook's only visual presence on the whole page.
export default function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header
      className="flex items-center justify-between"
      style={{
        height: 64,
        padding: '0 24px',
        borderBottom: '1px solid var(--ob-co-border-quiet)',
        background: 'var(--ob-co-bg)',
      }}
    >
      {/* TODO: replace with final OpenBook brand mark when finalised */}
      <span
        style={{
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: '-0.01em',
          color: 'var(--ob-co-gold)',
        }}
      >
        OpenBook
      </span>
      {children}
    </header>
  );
}
