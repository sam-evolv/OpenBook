import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'OpenBook AI — Book anything, instantly',
  description: 'Book local wellness businesses in seconds. Gyms, salons, barbers, spas, yoga and more. Your local services, one tap away.',
  keywords: ['book online', 'local services', 'gym booking', 'salon booking', 'barber booking', 'wellness booking', 'Ireland', 'OpenBook'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
