import { GeistSans } from 'geist/font/sans';
import type { ReactNode } from 'react';

// Scope Geist Sans to the /c/[token] route. The brief calls Geist out
// explicitly as the display + body face for checkout, but the root
// layout only loads Fraunces. Adding the variable here means the
// `var(--font-geist-sans, …)` references in CheckoutClient resolve to
// the real Geist Sans face for these pages.
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <div className={GeistSans.variable}>{children}</div>;
}
