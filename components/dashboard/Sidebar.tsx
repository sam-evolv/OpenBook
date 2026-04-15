'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, BookOpen, Users,
  Dumbbell, Package, MessageSquare, Globe, Settings, Star,
  ChevronDown, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label:       string
  href:        string
  icon:        React.ElementType
  badge?:      number
  badgeColor?: 'gold' | 'red'
  external?:   boolean
}

const mainNav: NavItem[] = [
  { label: 'Overview',  href: '/overview',  icon: LayoutDashboard },
  { label: 'Calendar',  href: '/calendar',  icon: Calendar },
  { label: 'Bookings',  href: '/bookings',  icon: BookOpen },
  { label: 'Customers', href: '/customers', icon: Users },
]

const revenueNav: NavItem[] = [
  { label: 'Services', href: '/services', icon: Dumbbell },
  { label: 'Packages', href: '/packages', icon: Package },
]

const commsNav: NavItem[] = [
  { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 2, badgeColor: 'red' },
  { label: 'Reviews',  href: '/reviews',  icon: Star },
]

const consumerNav: NavItem[] = [
  { label: 'Booking Page',  href: '/evolv-performance', icon: Globe, external: true },
  { label: 'WhatsApp Bot',  href: '/settings', icon: MessageCircle },
]

function CompassIcon() {
  return (
    <svg viewBox="0 0 40 40" width="22" height="22" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="16" stroke="#D4AF37" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="9"  stroke="#D4AF37" strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="3.5" fill="#D4AF37" />
      <line x1="20" y1="4"  x2="20" y2="11" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="29" x2="20" y2="36" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      <line x1="4"  y1="20" x2="11" y2="20" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
      <line x1="29" y1="20" x2="36" y2="20" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      target={item.external ? '_blank' : undefined}
      className={cn(
        'group relative flex items-center h-9 px-3 rounded-lg text-[14px] font-medium transition-all duration-150 ease-out',
        isActive
          ? 'text-[#D4AF37]'
          : 'text-white/50 hover:text-white/[0.85] hover:bg-white/[0.05]',
      )}
      style={isActive ? {
        background: 'rgba(212,175,55,0.1)',
        borderLeft: '2px solid #D4AF37',
      } : undefined}
    >
      <item.icon
        size={16}
        className={cn(
          'shrink-0 mr-2.5 transition-colors duration-150',
          isActive ? 'text-[#D4AF37]' : 'text-white/30 group-hover:text-white/60',
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>

      {item.badge !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-semibold leading-none',
            item.badgeColor === 'red'
              ? 'bg-red-500 text-white'
              : 'bg-[rgba(212,175,55,0.2)] text-[#D4AF37]',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-0.5">
      <p className="section-label px-3 mb-1.5">
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
    <aside
      className="fixed inset-y-0 left-0 z-40 w-[220px] flex flex-col"
      style={{
        background: '#050505',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-14 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <CompassIcon />
        <p className="text-[13px] font-bold text-white leading-tight tracking-tight">
          OpenBook<span className="text-[#D4AF37] ml-0.5">AI</span>
        </p>
      </div>

      {/* Business switcher */}
      <div className="px-3 pt-3 pb-1">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] transition-colors duration-150 hover:bg-white/[0.07]"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-white truncate">Evolv Performance</p>
            <p className="text-[10px] text-white/35 truncate">Fitness & Wellness</p>
          </div>
          <ChevronDown size={14} className="text-white/30 shrink-0" />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-5">
        <NavSection label="Main"     items={mainNav}     pathname={pathname} />
        <NavSection label="Revenue"  items={revenueNav}  pathname={pathname} />
        <NavSection label="Comms"    items={commsNav}     pathname={pathname} />
        <NavSection label="Consumer" items={consumerNav}  pathname={pathname} />
      </nav>

      {/* Bottom: Settings pinned */}
      <div className="px-2 pb-2">
        <NavLink item={{ label: 'Settings', href: '/settings', icon: Settings }} pathname={pathname} />
      </div>

      {/* User footer */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-4 h-14"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ background: '#D4AF37' }}
        >
          <span className="text-[11px] font-bold text-black">EP</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-white/60 truncate">owner@evolv.com</p>
        </div>
        <Settings size={14} className="text-white/30 shrink-0 cursor-pointer hover:text-white/60 transition-colors" />
      </div>
    </aside>
  )
}
