'use client'

import { ChevronRight, User, Settings, Star, CalendarDays } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'

const MENU_ITEMS = [
  { icon: CalendarDays, label: 'My bookings',     sub: 'View upcoming & past appointments' },
  { icon: Star,         label: 'Favourites',       sub: 'Businesses you saved'              },
  { icon: Settings,     label: 'Settings',         sub: 'Notifications, payments, account'  },
]

export default function MePage() {
  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32">
        <div className="px-5 pt-14 pb-5">
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Me
          </h1>
        </div>

        {/* Avatar + sign-in */}
        <div className="flex flex-col items-center px-5 pt-4 pb-8">
          <div
            style={{
              width:          80,
              height:         80,
              borderRadius:   40,
              background:     'rgba(255,255,255,0.08)',
              border:         '1px solid rgba(212,175,55,0.3)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              marginBottom:   14,
            }}
          >
            <User size={36} color="#D4AF37" strokeWidth={1.5} />
          </div>

          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Sign in to OpenBook
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>
            Manage bookings &amp; favourites
          </p>

          <button
            style={{
              marginTop:    18,
              height:       52,
              width:        '100%',
              borderRadius: 14,
              background:   '#D4AF37',
              color:        '#000',
              fontSize:     16,
              fontWeight:   700,
              border:       'none',
              cursor:       'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Sign in
          </button>
        </div>

        {/* Menu items */}
        <div className="px-4 flex flex-col gap-2">
          {MENU_ITEMS.map(({ icon: Icon, label, sub }) => (
            <button
              key={label}
              className="text-left active:scale-[0.98] transition-transform duration-150 w-full"
              style={{
                background:           'rgba(255,255,255,0.06)',
                backdropFilter:       'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border:               '1px solid rgba(255,255,255,0.09)',
                borderRadius:         16,
                padding:              '16px 18px',
                display:              'flex',
                alignItems:           'center',
                gap:                  14,
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width:          36,
                  height:         36,
                  borderRadius:   '50%',
                  background:     'rgba(212,175,55,0.15)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                <Icon size={17} color="#D4AF37" strokeWidth={1.8} />
              </div>

              {/* Labels */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{sub}</p>
              </div>

              {/* Chevron */}
              <ChevronRight size={16} color="rgba(255,255,255,0.25)" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
