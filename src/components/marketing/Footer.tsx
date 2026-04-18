import Link from 'next/link';
import { LOGIN_URL, SIGNUP_URL } from './shared/appUrl';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'AI distribution', href: '#ai' },
      { label: 'Dashboard', href: '#dashboard' },
      { label: 'Consumer app', href: '#consumer' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: 'mailto:hello@openbook.ie' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Careers', href: '/careers' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'MCP server', href: 'https://mcp.openbook.ie' },
      { label: 'Status', href: 'https://status.openbook.ie' },
      { label: 'Help centre', href: '/help' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Data processing', href: '/dpa' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] pt-20 pb-10 bg-ink">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 grid grid-cols-2 md:grid-cols-6 gap-10">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-[24px] font-semibold tracking-tightest">
              Open<span className="text-gold">Book</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-[14px] leading-[1.55] text-paper/55 font-display italic">
            The booking platform built for the AI era.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={SIGNUP_URL}
              className="rounded-full bg-gold text-ink px-4 py-2 text-[12.5px] font-semibold"
            >
              Get started
            </a>
            <a
              href={LOGIN_URL}
              className="text-[12.5px] text-paper/70 hover:text-paper transition-colors"
            >
              Sign in
            </a>
          </div>
        </div>

        {COLS.map((c) => (
          <div key={c.title}>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-paper/45">
              {c.title}
            </div>
            <ul className="mt-5 flex flex-col gap-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[13.5px] text-paper/75 hover:text-paper transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 lg:px-10 mt-16 pt-6 border-t border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-[12px] text-paper/45">
          © 2026 OpenHouse AI Limited. Trading as OpenBook. Registered in Ireland.
        </div>
        <div className="flex items-center gap-4 text-paper/60">
          <a href="https://x.com/openbookie" aria-label="X" className="hover:text-paper transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.84l-5.34-7-6.11 7H1l8.02-9.18L1.5 2h7.02l4.83 6.4L18.24 2zm-2.4 18.1h1.9L7.28 3.8H5.24l10.6 16.3z" />
            </svg>
          </a>
          <a
            href="https://instagram.com/openbookie"
            aria-label="Instagram"
            className="hover:text-paper transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
          </a>
          <a
            href="https://linkedin.com/company/openbookie"
            aria-label="LinkedIn"
            className="hover:text-paper transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.82-2.05 3.75-2.05 4 0 4.75 2.64 4.75 6.08V21H18.6v-5.5c0-1.3-.02-3-1.83-3-1.84 0-2.13 1.43-2.13 2.9V21H10V9z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
