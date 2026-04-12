'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  Dumbbell,
  Package,
  MessageSquare,
  Globe,
  Settings,
} from 'lucide-react'

function OpenBookLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#D4AF37" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="3.5" stroke="#D4AF37" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1" fill="#D4AF37" />
      {/* Cardinal lines */}
      <line x1="8" y1="1" x2="8" y2="4.5" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="11.5" x2="8" y2="15" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="1" y1="8" x2="4.5" y2="8" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.5" y1="8" x2="15" y2="8" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  badgeColor?: 'gold' | 'red'
}

const mainNav: NavItem[] = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: Calendar, badge: 3, badgeColor: 'gold' },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Services', href: '/services', icon: Dumbbell },
]

const revenueNav: NavItem[] = [
  { label: 'Packages', href: '/packages', icon: Package },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 2, badgeColor: 'red' },
]

const consumerNav: NavItem[] = [
  { label: 'Booking Page', href: '/evolv-performance', icon: Globe },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 rounded-premium text-sm font-medium transition-all duration-150 ease-premium',
        isActive
          ? 'text-brand-500 bg-brand-500/10'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      )}
    >
      {/* Active left bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-full" />
      )}

      <item.icon
        size={16}
        className={cn(
          'shrink-0 transition-colors duration-150',
          isActive ? 'text-brand-500' : 'text-gray-500 group-hover:text-gray-300'
        )}
      />
      <span className="flex-1">{item.label}</span>

      {item.badge !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold leading-none',
            item.badgeColor === 'red'
              ? 'bg-red-500 text-white'
              : 'bg-brand-500/20 text-brand-500'
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string
  items: NavItem[]
  pathname: string
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/25">
        {label}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[228px] flex flex-col bg-sidebar border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[52px] border-b border-white/5 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-[8px] shrink-0" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <OpenBookLogo />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight tracking-tight">
            OpenBook AI
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-4 px-2 space-y-5">
        <NavSection label="Main" items={mainNav} pathname={pathname} />
        <NavSection label="Revenue" items={revenueNav} pathname={pathname} />
        <NavSection label="Consumer" items={consumerNav} pathname={pathname} />
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/5 p-2 space-y-0.5">
        {/* Business card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-premium hover:bg-white/5 transition-colors duration-150 cursor-pointer">
          <div className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-brand-500/20 shrink-0">
            <span className="text-[11px] font-bold text-brand-500">EP</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-gray-200 truncate leading-tight">
              Evolv Performance
            </p>
            <p className="text-[10px] text-white/25 leading-tight">Pro Plan</p>
          </div>
        </div>

        <NavLink
          item={{ label: 'Settings', href: '/settings', icon: Settings }}
          pathname={pathname}
        />
      </div>
    </aside>
  )
}
