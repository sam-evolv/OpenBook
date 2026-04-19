'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Clock,
  Settings,
  ExternalLink,
  LogOut,
} from 'lucide-react';

interface Props {
  business: {
    id: string;
    name: string;
    slug: string;
    processed_icon_url: string | null;
    primary_colour: string | null;
  };
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/services', label: 'Services', icon: Briefcase },
  { href: '/dashboard/hours', label: 'Hours', icon: Clock },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardNav({ business }: Props) {
  const pathname = usePathname() ?? '';

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col border-r"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: '#0A0A0A',
      }}
    >
      {/* Business identity */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          {business.processed_icon_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={business.processed_icon_url}
              alt=""
              className="h-10 w-10 rounded-xl shrink-0"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: business.primary_colour ?? '#D4AF37' }}
            >
              <span className="text-[18px] font-bold text-black">
                {business.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{business.name}</p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              openbook.ie/{business.slug}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
                }}
              >
                <Icon
                  className="h-4 w-4"
                  strokeWidth={active ? 2.2 : 1.8}
                  style={{ color: active ? '#D4AF37' : 'currentColor' }}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <a
          href={`https://app.openbook.ie/business/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
          View live app
        </a>
        <a
          href="/api/auth/signout"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
          Sign out
        </a>
      </div>
    </aside>
  );
}
