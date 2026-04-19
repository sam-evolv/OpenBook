'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ExploreIcon,
  AssistantIcon,
  BookingsIcon,
  MeIcon,
} from '@/components/icons/DockIcons';

type Item = {
  href: string;
  label: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

const items: Item[] = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/explore', label: 'Explore', Icon: ExploreIcon },
  { href: '/assistant', label: 'Ask AI', Icon: AssistantIcon },
  { href: '/bookings', label: 'Bookings', Icon: BookingsIcon },
  { href: '/me', label: 'Me', Icon: MeIcon },
];

export default function FloatingDock() {
  const pathname = usePathname();

  return (
    <div
      className="safe-bottom"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 18,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: 28,
          background: 'rgba(20,20,20,0.72)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        }}
      >
        {items.map(({ href, label, Icon }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 0',
                color: active ? '#D4AF37' : '#888888',
                transition: 'color 160ms ease',
              }}
            >
              <Icon width={22} height={22} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
