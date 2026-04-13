'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, MapPin, CalendarPlus, Home } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'

function ConfirmContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const service  = searchParams?.get('service')  ?? 'Your booking'
  const time     = searchParams?.get('time')     ?? ''
  const business = searchParams?.get('business') ?? ''
  const price    = searchParams?.get('price')    ?? ''
  const colour   = searchParams?.get('colour')   ?? '#D4AF37'

  return (
    <WallpaperBackground>
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
        style={{ position: 'relative', zIndex: 1 }}
      >

        {/* ── Success icon ── */}
        <div className="relative mb-6">
          <div
            style={{
              width:          80,
              height:         80,
              borderRadius:   40,
              background:     'rgba(52,211,153,0.15)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={42} color="#34d399" strokeWidth={1.5} />
          </div>
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(52,211,153,0.08)' }}
          />
        </div>

        {/* ── Heading ── */}
        <h1
          style={{
            fontSize:      28,
            fontWeight:    900,
            color:         '#fff',
            letterSpacing: '-0.03em',
            margin:        '0 0 6px',
            textAlign:     'center',
          }}
        >
          You&apos;re booked.
        </h1>
        <p
          style={{
            fontSize:     14,
            color:        'rgba(255,255,255,0.45)',
            textAlign:    'center',
            marginBottom: 28,
          }}
        >
          A confirmation has been sent to your email.
        </p>

        {/* ── Details card ── */}
        <div
          className="w-full max-w-sm"
          style={{
            background:           'rgba(255,255,255,0.07)',
            backdropFilter:       'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border:               '1px solid rgba(255,255,255,0.11)',
            borderRadius:         16,
            padding:              '18px 18px',
            marginBottom:         28,
          }}
        >
          {/* Service name row */}
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                width:        10,
                height:       10,
                borderRadius: 5,
                background:   colour,
                flexShrink:   0,
                boxShadow:    `0 0 8px ${colour}88`,
              }}
            />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
              {service}
            </p>
            {price && (
              <p
                style={{
                  fontSize:   14,
                  fontWeight: 800,
                  color:      colour,
                  margin:     '0 0 0 auto',
                  flexShrink: 0,
                }}
              >
                €{price}
              </p>
            )}
          </div>

          {/* Time row */}
          {time && (
            <div className="flex items-center gap-2.5 mb-3">
              <Clock size={13} color="rgba(255,255,255,0.42)" />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Today · {time}
              </p>
            </div>
          )}

          {/* Business row */}
          {business && (
            <div className="flex items-center gap-2.5">
              <MapPin size={13} color="rgba(255,255,255,0.42)" />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                {business}
              </p>
            </div>
          )}
        </div>

        {/* ── Add to calendar ── */}
        <button
          className="active:scale-95 transition-transform duration-150"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            height:         44,
            paddingLeft:    20,
            paddingRight:   20,
            borderRadius:   12,
            background:     'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border:         '1px solid rgba(255,255,255,0.15)',
            color:          'rgba(255,255,255,0.82)',
            fontSize:       14,
            fontWeight:     600,
            cursor:         'pointer',
            marginBottom:   12,
          }}
        >
          <CalendarPlus size={15} />
          Add to calendar
        </button>

        {/* ── Back to home ── */}
        <button
          onClick={() => router.push('/home')}
          className="active:scale-95 transition-transform duration-150"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            height:         44,
            paddingLeft:    20,
            paddingRight:   20,
            borderRadius:   12,
            background:     'transparent',
            border:         '1px solid rgba(255,255,255,0.10)',
            color:          'rgba(255,255,255,0.50)',
            fontSize:       14,
            fontWeight:     500,
            cursor:         'pointer',
          }}
        >
          <Home size={15} />
          Back to home
        </button>

      </div>
    </WallpaperBackground>
  )
}

export default function BookingConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
