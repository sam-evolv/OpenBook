'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Calendar,
  Briefcase,
  Clock,
  Settings,
  ExternalLink,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useDashboardTheme } from './ThemeProvider';

interface Props {
  business: {
    id: string;
    name: string;
    slug: string;
    processed_icon_url: string | null;
    primary_colour: string | null;
  };
  ownerName?: string;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/services', label: 'Services', icon: Briefcase },
  { href: '/dashboard/hours', label: 'Hours', icon: Clock },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardNav({ business, ownerName }: Props) {
  const pathname = usePathname() ?? '';
  const { theme, toggle } = useDashboardTheme();

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col border-r"
      style={{
        borderColor: 'var(--border-1)',
        background: 'var(--bg-1)',
      }}
    >
      {/* Business identity */}
      <div
        className="p-4 border-b"
        style={{ borderColor: 'var(--border-1)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 group">
          {business.processed_icon_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={business.processed_icon_url}
              alt=""
              className="h-9 w-9 rounded-[8px] shrink-0"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            />
          ) : (
            <div
              className="h-9 w-9 rounded-[8px] shrink-0 flex items-center justify-center"
              style={{ background: business.primary_colour ?? 'var(--accent)' }}
            >
              <span className="text-[16px] font-bold" style={{ color: 'var(--accent-fg)' }}>
                {business.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold truncate"
              style={{ color: 'var(--fg-0)', letterSpacing: '-0.01em' }}
            >
              {business.name}
            </p>
            <p
              className="text-[11px] truncate font-mono"
              style={{ color: 'var(--fg-2)' }}
            >
              /{business.slug}
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="flex flex-col gap-px">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] transition-colors"
                style={{
                  color: active ? 'var(--fg-0)' : 'var(--fg-1)',
                  background: active ? 'var(--bg-3)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon
                  className="h-[15px] w-[15px]"
                  strokeWidth={active ? 2 : 1.6}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="p-2 border-t flex flex-col gap-px"
        style={{ borderColor: 'var(--border-1)' }}
      >
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] transition-colors"
          style={{ color: 'var(--fg-1)', background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {theme === 'dark' ? (
            <Sun className="h-[14px] w-[14px]" strokeWidth={1.8} />
          ) : (
            <Moon className="h-[14px] w-[14px]" strokeWidth={1.8} />
          )}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <a
          href={`https://app.openbook.ie/business/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] transition-colors"
          style={{ color: 'var(--fg-1)', background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <ExternalLink className="h-[14px] w-[14px]" strokeWidth={1.8} />
          View live app
        </a>
        <a
          href="/api/auth/signout"
          className="flex items-center gap-2.5 px-3 h-8 rounded-md text-[12px] transition-colors"
          style={{ color: 'var(--fg-1)', background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="h-[14px] w-[14px]" strokeWidth={1.8} />
          Sign out
        </a>
      </div>
    </aside>
  );
}
