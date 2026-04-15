import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'OpenBook',
  description: 'Book health & wellness appointments near you.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
