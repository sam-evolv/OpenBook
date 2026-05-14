'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  CalendarDays,
  MessageCircle,
  Calendar,
  Users,
  Layers,
  Clock,
  Settings,
  Wallet,
  Sparkles,
  Sun,
  Moon,
  MonitorSmartphone,
  BadgePercent,
  UserRound,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  count?: number;
  unread?: boolean;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '/dashboard/overview', icon: LayoutGrid },
  { id: 'my-app', label: 'My App', href: '/dashboard/my-app', icon: MonitorSmartphone },
  { id: 'calendar', label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
  { id: 'bookings', label: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: Users },
  { id: 'catalog', label: 'Catalog', href: '/dashboard/catalog', icon: Layers },
  { id: 'messages', label: 'Messages', href: '/dashboard/messages', icon: MessageCircle },
  { id: 'flash-sales', label: 'Flash Sales', href: '/dashboard/flash-sales', icon: BadgePercent },
  { id: 'intelligence', label: 'Intelligence', href: '/dashboard/intelligence', icon: Sparkles },
  { id: 'finance', label: 'Finance', href: '/dashboard/finance', icon: Wallet },
  { id: 'team', label: 'Team', href: '/dashboard/team', icon: UserRound },
  { id: 'hours', label: 'Hours', href: '/dashboard/hours', icon: Clock },
  { id: 'website', label: 'Website', href: '/dashboard/website', icon: Globe },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export type SidebarPlan = 'free' | 'pro' | 'complete';

const PLAN_LABEL: Record<SidebarPlan, string> = {
  free: 'Free plan',
  pro: 'Pro plan',
  complete: 'Complete plan',
};

interface SidebarProps {
  businessName?: string;
  businessLogoUrl?: string | null;
  userName?: string;
  userInitials?: string;
  plan?: SidebarPlan;
  unreadMessagesCount?: number;
  upcomingBookingsCount?: number;
  className?: string;
}

export function Sidebar({
  businessName = 'Your business',
  businessLogoUrl = null,
  userName = 'You',
  userInitials = 'YO',
  plan = 'free',
  unreadMessagesCount = 0,
  upcomingBookingsCount = 0,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const { mode, toggle } = useTheme();

  const items = navItems.map((item) => ({
    ...item,
    count:
      item.id === 'messages'
        ? unreadMessagesCount > 0
          ? unreadMessagesCount
          : undefined
        : item.id === 'bookings'
          ? upcomingBookingsCount > 0
            ? upcomingBookingsCount
            : undefined
          : undefined,
    unread: item.id === 'messages' && unreadMessagesCount > 0,
  }));

  const planLabel = PLAN_LABEL[plan] ?? PLAN_LABEL.free;
  const isFreePlan = plan === 'free';

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen w-[244px] flex-col border-r bg-paper-bg dark:bg-ink-bg border-paper-border dark:border-ink-border',
        className,
      )}
    >
      <div className="flex items-center gap-3 p-5">
        {businessLogoUrl ? (
          <img
            src={businessLogoUrl}
            alt={businessName}
            className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-gold to-gold-muted text-[15px] font-semibold text-white shadow-[0_0_0_1px_rgba(212,175,55,0.25)]">
            {businessName[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold leading-tight text-paper-text-1 dark:text-ink-text-1">
            {businessName}
          </div>
        </div>
      </div>

      <div className="border-t border-paper-border dark:border-ink-border" />

      <nav className="sidebar-scroll flex flex-1 flex-col gap-[2px] overflow-y-auto py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href) ?? false;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-[14px] py-[12px] transition-colors duration-150 ease-out',
                isActive
                  ? 'bg-gold-soft text-gold font-medium'
                  : 'text-paper-text-2 dark:text-ink-text-2 hover:bg-paper-surface dark:hover:bg-ink-surface hover:text-paper-text-1 dark:hover:text-ink-text-1',
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold"
                />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.75}
                className={cn(
                  'shrink-0 transition-colors duration-150 ease-out',
                  isActive
                    ? 'text-gold'
                    : 'text-paper-text-3 dark:text-ink-text-3 group-hover:text-paper-text-1 dark:group-hover:text-ink-text-1',
                )}
              />
              <span className="flex-1 text-[14px]">{item.label}</span>
              {item.badge && (
                <span className="rounded-[3px] border border-gold-border bg-gold-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-gold">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined &&
                (item.unread ? (
                  <span className="min-w-[16px] rounded-[3px] bg-gold px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-black">
                    {item.count}
                  </span>
                ) : (
                  <span className="text-[11px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
                    {item.count}
                  </span>
                ))}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-paper-border dark:border-ink-border" />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-paper-surface2 to-paper-borderStrong dark:from-ink-surface2 dark:to-ink-borderStrong text-[11px] font-semibold text-paper-text-1 dark:text-ink-text-1">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1">
              {userName}
            </div>
            <div className="truncate text-[11px] text-paper-text-3 dark:text-ink-text-3">
              {planLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {isFreePlan ? (
            <Link
              href="/dashboard/settings/billing"
              className="rounded-xl bg-gold px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-black transition-colors hover:bg-gold-muted"
            >
              Upgrade
            </Link>
          ) : (
            <span />
          )}
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-paper-text-2 transition-colors hover:bg-paper-surface hover:text-paper-text-1 dark:text-ink-text-2 dark:hover:bg-ink-surface dark:hover:text-ink-text-1"
            aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileDashboardNav({
  businessName = 'Your business',
  unreadMessagesCount = 0,
  upcomingBookingsCount = 0,
}: Pick<SidebarProps, 'businessName' | 'unreadMessagesCount' | 'upcomingBookingsCount'>) {
  const pathname = usePathname();
  const { mode, toggle } = useTheme();

  const items = navItems.map((item) => ({
    ...item,
    count:
      item.id === 'messages'
        ? unreadMessagesCount > 0
          ? unreadMessagesCount
          : undefined
        : item.id === 'bookings'
          ? upcomingBookingsCount > 0
            ? upcomingBookingsCount
            : undefined
          : undefined,
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-paper-border bg-paper-bg/95 px-4 py-3 backdrop-blur-xl dark:border-ink-border dark:bg-ink-bg/95 xl:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-muted text-[14px] font-bold text-black">
          {businessName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1">
            {businessName}
          </p>
          <p className="text-[11px] text-paper-text-3 dark:text-ink-text-3">
            Dashboard
          </p>
        </div>
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-paper-border bg-paper-surface text-paper-text-2 transition-colors dark:border-ink-border dark:bg-ink-surface dark:text-ink-text-2"
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href) ?? false;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'relative flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-gold bg-gold text-black'
                  : 'border-paper-border bg-paper-surface text-paper-text-2 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text-2',
              )}
            >
              <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={cn(
                    'ml-0.5 min-w-[17px] rounded-full px-1.5 text-center text-[10px] font-semibold tabular-nums',
                    isActive ? 'bg-black/12 text-black' : 'bg-gold text-black',
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
