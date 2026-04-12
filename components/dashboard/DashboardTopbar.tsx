'use client'

import { usePathname } from 'next/navigation'
import { Topbar } from './Topbar'

const pageTitles: Record<string, string> = {
  '/overview': 'Overview',
  '/schedule': 'Schedule',
  '/bookings': 'Bookings',
  '/customers': 'Customers',
  '/services': 'Services',
  '/packages': 'Packages',
  '/messages': 'Messages',
  '/settings': 'Settings',
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'OpenBook AI'
  return <Topbar title={title} />
}
