'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LOGIN_URL, SIGNUP_URL } from './shared/appUrl';

const links = [
  { href: '#features', label: 'Product' },
  { href: '#ai', label: 'AI distribution' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-ink/70 border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10 transition-all duration-300 ${
          scrolled ? 'h-14' : 'h-20'
        }`}
      >
        <Link href="/" className="flex items-center gap-2 group" aria-label="OpenBook">
          <span className="font-display text-[22px] font-semibold tracking-tightest">
            Open<span className="text-gold">Book</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-paper/70 hover:text-paper transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={LOGIN_URL}
            className="text-[13px] text-paper/70 hover:text-paper transition-colors px-2"
          >
            Sign in
          </a>
          <a
            href={SIGNUP_URL}
            className="rounded-full bg-gold text-ink px-4 py-2 text-[13px] font-semibold hover:brightness-105 transition"
          >
            Get started
          </a>
        </div>

        <button
          className="md:hidden text-paper/80 w-10 h-10 flex items-center justify-center"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            {open ? (
              <>
                <path d="M5 5l14 14" strokeLinecap="round" />
                <path d="M19 5L5 19" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M4 8h16" strokeLinecap="round" />
                <path d="M4 16h16" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-ink/95 backdrop-blur-xl">
          <div className="px-6 py-6 flex flex-col gap-5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-[15px] text-paper/80"
              >
                {l.label}
              </a>
            ))}
            <div className="h-px bg-white/[0.06]" />
            <a href={LOGIN_URL} className="text-[15px] text-paper/80">
              Sign in
            </a>
            <a
              href={SIGNUP_URL}
              className="rounded-full bg-gold text-ink text-center py-3 font-semibold"
            >
              Get started
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
