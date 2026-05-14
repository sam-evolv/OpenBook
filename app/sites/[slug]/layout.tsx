import { GeistSans } from 'geist/font/sans';
import type { ReactNode } from 'react';

/**
 * Marketing-site layout. Deliberately barebones — no consumer dock,
 * no dashboard chrome, no bottom tabs. The marketing surface is its
 * own thing; whatever business loads under [slug].openbook.ie should
 * render exactly the marketing page and nothing else.
 *
 * The root layout still loads Fraunces and sets the html `lang` /
 * theme. This file just stamps Geist into the subtree so the body
 * type resolves to a sans-serif on the consumer-facing site (the
 * consumer routes don't load Geist by default; the marketing site
 * does because the spec specifies it).
 */
export default function MarketingSiteLayout({ children }: { children: ReactNode }) {
  return <div className={`${GeistSans.variable} font-sans`}>{children}</div>;
}
