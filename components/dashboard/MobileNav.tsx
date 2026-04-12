'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, BookOpen, Users, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Packages', href: '/packages', icon: Package },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-white/[0.07] flex h-14 safe-area-pb">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isActive ? 'text-brand-500' : 'text-white/30'
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
