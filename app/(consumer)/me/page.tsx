'use client'

import { User, Settings, Star, CalendarDays } from 'lucide-react'
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

        {/* Avatar placeholder */}
        <div className="flex flex-col items-center px-5 pt-4 pb-8">
          <div
            style={{
              width:          80,
              height:         80,
              borderRadius:   40,
              background:     'rgba(212,175,55,0.12)',
              border:         '2px solid rgba(212,175,55,0.3)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              marginBottom:   12,
            }}
          >
            <User size={36} color="#D4AF37" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>Sign in to OpenBook</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
            Manage bookings &amp; favourites
          </p>
          <button
            style={{
              marginTop:    16,
              height:       40,
              paddingLeft:  24,
              paddingRight: 24,
              borderRadius: 12,
              background:   '#D4AF37',
              color:        '#000',
              fontSize:     14,
              fontWeight:   700,
              border:       'none',
              cursor:       'pointer',
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
                backdropFilter:       'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border:               '1px solid rgba(255,255,255,0.1)',
                borderRadius:         12,
                padding:              '14px 16px',
                display:              'flex',
                alignItems:           'center',
                gap:                  14,
              }}
            >
              <div
                style={{
                  width:          38,
                  height:         38,
                  borderRadius:   12,
                  background:     'rgba(212,175,55,0.1)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                <Icon size={18} color="#D4AF37" strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
