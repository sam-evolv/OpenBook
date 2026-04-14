'use client'

import { usePathname } from 'next/navigation'
import { Topbar } from './Topbar'

const pageTitles: Record<string, string> = {
  '/overview': 'Overview',
  '/calendar': 'Calendar',
  '/bookings': 'Bookings',
  '/customers': 'Customers',
  '/services': 'Services',
  '/packages': 'Packages',
  '/messages': 'Messages',
  '/reviews': 'Reviews',
  '/settings': 'Settings',
  '/settings/hours': 'Opening Hours',
  '/settings/payments': 'Payments',
  '/settings/notifications': 'Notifications',
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'OpenBook AI'
  return <Topbar title={title} />
}
