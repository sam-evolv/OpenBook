'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Home, Search, CalendarDays, Wallet, User } from 'lucide-react'

type TabId = 'home' | 'explore' | 'bookings' | 'wallet' | 'me'

const TABS: { id: TabId; label: string; icon: React.ElementType; href: string }[] = [
  { id: 'home',     label: 'OpenBook', icon: Home,          href: '/home'    },
  { id: 'explore',  label: 'Explore',  icon: Search,        href: '/explore' },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays,  href: '/consumer-bookings'},
  { id: 'wallet',   label: 'Wallet',   icon: Wallet,        href: '/wallet'  },
  { id: 'me',       label: 'Me',       icon: User,          href: '/me'      },
]

export default function GlassDock() {
  const router   = useRouter()
  const pathname = usePathname()

  const activeTab =
    TABS.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'))?.id ?? 'home'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="mx-4 mb-3 rounded-2xl"
        style={{
          background:           'rgba(14, 14, 20, 0.84)',
          backdropFilter:       'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border:               '1px solid rgba(255,255,255,0.11)',
          boxShadow:            '0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {TABS.map(({ id, label, icon: Icon, href }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => router.push(href)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
                style={{ background: 'transparent' }}
              >
                <Icon
                  size={22}
                  style={{
                    color:       isActive ? '#D4AF37' : 'rgba(255,255,255,0.55)',
                    strokeWidth: isActive ? 2.2 : 1.7,
                  }}
                />
                <span
                  style={{
                    fontSize:      10,
                    fontWeight:    isActive ? 700 : 500,
                    color:         isActive ? '#D4AF37' : 'rgba(255,255,255,0.55)',
                    letterSpacing: '0.02em',
                    textShadow:    '0 1px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
