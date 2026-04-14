'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, MapPin, CalendarPlus, Home } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'

const CONFETTI = [
  { color: '#D4AF37', tx:   0, ty: -90 },
  { color: '#10b981', tx:  64, ty: -64 },
  { color: '#3b82f6', tx:  90, ty:   0 },
  { color: '#f59e0b', tx:  64, ty:  64 },
  { color: '#ec4899', tx:   0, ty:  90 },
  { color: '#8b5cf6', tx: -64, ty:  64 },
  { color: '#ef4444', tx: -90, ty:   0 },
  { color: '#06b6d4', tx: -64, ty: -64 },
]

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
      <style>{`
        ${CONFETTI.map((d, i) => `
          @keyframes confetti-${i} {
            0%   { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
            100% { transform: translate(calc(-50% + ${d.tx}px), calc(-50% + ${d.ty}px)) scale(0.4); opacity: 0; }
          }
        `).join('')}
        @keyframes checkScale {
          0%   { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
        style={{ position: 'relative', zIndex: 1 }}
      >

        {/* ── Success icon + confetti ── */}
        <div className="relative mb-6" style={{ width: 80, height: 80 }}>

          {/* Confetti dots */}
          {CONFETTI.map((d, i) => (
            <div
              key={i}
              style={{
                position:   'absolute',
                top:        '50%',
                left:       '50%',
                width:      8,
                height:     8,
                borderRadius: '50%',
                background: d.color,
                animation:  `confetti-${i} 0.65s ease-out ${i * 35}ms both`,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Checkmark circle */}
          <div
            style={{
              width:          80,
              height:         80,
              borderRadius:   40,
              background:     'rgba(16,185,129,0.15)',
              border:         '2px solid #10b981',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              animation:      'checkScale 400ms cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <CheckCircle size={42} color="#10b981" strokeWidth={1.5} />
          </div>

          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(16,185,129,0.08)' }}
          />
        </div>

        {/* ── Heading ── */}
        <h1
          style={{
            fontSize:      28,
            fontWeight:    800,
            color:         '#fff',
            letterSpacing: '-0.03em',
            margin:        '24px 0 6px',
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
            background:   '#111111',
            border:       '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding:      20,
            marginBottom: 28,
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
                  fontWeight: 700,
                  color:      '#D4AF37',
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
