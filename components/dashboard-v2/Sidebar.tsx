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
  Search,
  Command,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  ChevronDown,
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
  { id: 'calendar', label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
  { id: 'bookings', label: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: Users },
  { id: 'catalog', label: 'Catalog', href: '/dashboard/catalog', icon: Layers },
  { id: 'messages', label: 'Messages', href: '/dashboard/messages', icon: MessageCircle },
  { id: 'finance', label: 'Finance', href: '/dashboard/finance', icon: Wallet },
  { id: 'hours', label: 'Hours', href: '/dashboard/hours', icon: Clock },
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
  businessSlug?: string;
  userName?: string;
  userInitials?: string;
  plan?: SidebarPlan;
  unreadMessagesCount?: number;
  upcomingBookingsCount?: number;
  className?: string;
}

export function Sidebar({
  businessName = 'Your business',
  businessSlug = 'your-business',
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
    <aside className={cn("sticky top-0 flex h-screen w-[244px] flex-col border-r bg-paper-bg dark:bg-ink-bg border-paper-border dark:border-ink-border px-3 pt-4 pb-3.5 text-[13.5px]", className)}>
      <div className="flex items-center gap-2.5 px-2 pb-3.5 mb-2.5 border-b border-paper-border dark:border-ink-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-gold to-gold-muted text-[13px] font-bold text-black shadow-[0_0_0_1px_rgba(212,175,55,0.25)]">
          {businessName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold leading-tight text-paper-text-1 dark:text-ink-text-1 truncate">
            {businessName}
          </div>
          <div className="text-[11.5px] font-mono text-paper-text-3 dark:text-ink-text-3">
            openbook.ie/{businessSlug}
          </div>
        </div>
        <ChevronDown size={14} className="text-paper-text-3 dark:text-ink-text-3" />
      </div>

      <button className="flex items-center gap-2.5 w-full px-2.5 py-2 mb-3.5 rounded-md bg-paper-surface dark:bg-ink-surface border border-paper-border dark:border-ink-border text-left text-[13px] text-paper-text-3 dark:text-ink-text-3 hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors">
        <Search size={14} />
        <span className="flex-1">Jump to…</span>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-paper-surface2 dark:bg-ink-surface2 text-[10.5px]">
          <Command size={9} /> K
        </div>
      </button>

      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href) ?? false;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors',
                isActive
                  ? 'bg-paper-surface2 dark:bg-ink-surface2 text-paper-text-1 dark:text-ink-text-1 font-medium'
                  : 'text-paper-text-2 dark:text-ink-text-2 hover:bg-paper-surface dark:hover:bg-ink-surface hover:text-paper-text-1 dark:hover:text-ink-text-1',
              )}
            >
              {isActive && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-3.5 w-0.5 rounded-r bg-gold" />
              )}
              <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9.5px] font-semibold uppercase tracking-wide text-gold bg-gold-soft border border-gold-border rounded-[3px] px-1.5 py-0.5">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined &&
                (item.unread ? (
                  <span className="min-w-[16px] text-center text-[10px] font-semibold tabular-nums text-black bg-gold rounded-[3px] px-1.5 py-0.5">
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

      <Link
        href="/dashboard/intelligence#ai-distribution"
        className="block rounded-xl border border-gold-border bg-gradient-to-br from-gold-soft to-transparent p-3 mb-2.5 hover:from-gold-soft/70 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={12} className="text-gold" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-gold">
            Live on AI
          </span>
        </div>
        <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 leading-[1.4]">
          Queryable on ChatGPT, Claude &amp; Gemini.
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-[11.5px] font-medium text-gold">
          View stats <ArrowRight size={11} />
        </div>
      </Link>

      <div className="flex items-center gap-2 pt-2 border-t border-paper-border dark:border-ink-border">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-paper-surface2 to-paper-borderStrong dark:from-ink-surface2 dark:to-ink-borderStrong text-[10px] font-semibold text-paper-text-1 dark:text-ink-text-1">
          {userInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
            {userName}
          </div>
          <div className="text-[10.5px] text-paper-text-3 dark:text-ink-text-3 truncate">
            {planLabel}
          </div>
        </div>
        {isFreePlan && (
          <Link
            href="/dashboard/settings/billing"
            className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-black bg-gold hover:bg-gold-muted rounded px-2 py-1 transition-colors"
          >
            Upgrade
          </Link>
        )}
        <button
          onClick={toggle}
          className="flex items-center justify-center p-1.5 rounded border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-colors"
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? (
            <Sun size={12} className="text-ink-text-2" />
          ) : (
            <Moon size={12} className="text-paper-text-2" />
          )}
        </button>
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
    <header className="sticky top-0 z-40 border-b border-paper-border bg-paper-bg/95 px-4 py-3 backdrop-blur-xl dark:border-ink-border dark:bg-ink-bg/95 lg:hidden">
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
