'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LiquidGlassIcon } from './LiquidGlassIcon';
import type { DockIconId } from '@/components/icons/DockIcons';

type Variant = 'diagonal' | 'radial-gold';

type Tab = {
  href: string;
  key: DockIconId;
  label: string;
  colour: string;
  variant: Variant;
};

const tabs: Tab[] = [
  {
    href: '/',
    key: 'home',
    label: 'Home',
    colour: '#2e2e34',
    variant: 'diagonal',
  },
  {
    href: '/explore',
    key: 'explore',
    label: 'Explore',
    colour: '#2e2e34',
    variant: 'diagonal',
  },
  {
    href: '/assistant',
    key: 'askAi',
    label: 'Ask AI',
    colour: '#D4AF37',
    variant: 'radial-gold',
  },
  {
    href: '/bookings',
    key: 'bookings',
    label: 'Bookings',
    colour: '#D4AF37',
    variant: 'diagonal',
  },
  {
    href: '/me',
    key: 'me',
    label: 'Me',
    colour: '#2e2e34',
    variant: 'diagonal',
  },
];

export default function FloatingDock() {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 28,
        zIndex: 30,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: 406,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '12px 18px',
          borderRadius: 30,
          background: 'rgba(30,25,18,0.55)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '0.5px solid rgba(255,255,255,0.14)',
          boxShadow:
            '0 10px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-label={tab.label}
              style={{
                display: 'inline-flex',
                textDecoration: 'none',
              }}
            >
              <LiquidGlassIcon
                size={50}
                primaryColour={tab.colour}
                variant={tab.variant}
                dockSymbolId={tab.key}
                active={isActive}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
