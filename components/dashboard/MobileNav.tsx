'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, BookOpen, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
  { label: 'Clients',  href: '/customers', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex h-14 pb-safe"
      style={{
        background: '#050505',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isActive ? 'text-[#D4AF37]' : 'text-white/40'
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
