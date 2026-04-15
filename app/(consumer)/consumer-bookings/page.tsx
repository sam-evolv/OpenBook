'use client'

import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'

export default function ConsumerBookingsPage() {
  const router = useRouter()

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div
          className="sticky top-0 z-20 px-5 pt-12 pb-4"
          style={{
            background:           'rgba(8,8,8,0.85)',
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom:         '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <h1
            style={{
              fontSize:      22,
              fontWeight:    900,
              color:         '#fff',
              letterSpacing: '-0.03em',
              margin:        0,
              lineHeight:    1,
            }}
          >
            My Bookings
          </h1>
        </div>

        {/* ── Empty state ── */}
        <div className="max-w-[390px] mx-auto px-5 pt-12">
          <div
            style={{
              borderRadius:         20,
              padding:              '40px 28px',
              display:              'flex',
              flexDirection:        'column',
              alignItems:           'center',
              gap:                  16,
              background:           'rgba(255,255,255,0.06)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border:               '1px solid rgba(255,255,255,0.10)',
              boxShadow:            '0 8px 32px rgba(0,0,0,0.28)',
            }}
          >
            {/* Calendar icon */}
            <div
              style={{
                width:          64,
                height:         64,
                borderRadius:   18,
                background:     'rgba(255,255,255,0.07)',
                border:         '1px solid rgba(255,255,255,0.12)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
            >
              <CalendarDays size={28} color="rgba(255,255,255,0.45)" strokeWidth={1.5} />
            </div>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p
                style={{
                  fontSize:      17,
                  fontWeight:    700,
                  color:         '#fff',
                  letterSpacing: '-0.02em',
                  margin:        0,
                }}
              >
                No bookings yet
              </p>
              <p
                style={{
                  fontSize:      14,
                  fontWeight:    400,
                  color:         'rgba(255,255,255,0.50)',
                  letterSpacing: '-0.01em',
                  lineHeight:    1.5,
                  margin:        0,
                }}
              >
                Book a session at any business to see it here
              </p>
            </div>

            {/* Gold CTA */}
            <button
              onClick={() => router.push('/explore')}
              className="active:scale-95 transition-transform duration-150"
              style={{
                marginTop:      8,
                height:         46,
                paddingLeft:    28,
                paddingRight:   28,
                borderRadius:   14,
                background:     '#D4AF37',
                border:         'none',
                cursor:         'pointer',
                fontSize:       15,
                fontWeight:     700,
                color:          '#1a1200',
                letterSpacing:  '-0.01em',
                boxShadow:      '0 4px 18px rgba(212,175,55,0.35)',
              }}
            >
              Explore businesses
            </button>
          </div>
        </div>

      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
