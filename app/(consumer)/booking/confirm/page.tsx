'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, MapPin, Clock, Home } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'

export default function BookingConfirmPage() {
  const router = useRouter()

  return (
    <WallpaperBackground>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">

        {/* Success icon */}
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
            style={{ background: 'rgba(52,211,153,0.1)' }}
          />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 6px', textAlign: 'center' }}>
          Booking confirmed!
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 28 }}>
          A confirmation has been sent to your email.
        </p>

        {/* Details card */}
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
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#D4AF37', flexShrink: 0 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Your booking</p>
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <Clock size={13} color="rgba(255,255,255,0.42)" />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              Today · Check your email for exact time
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin size={13} color="rgba(255,255,255,0.42)" />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              See confirmation email for address
            </p>
          </div>
        </div>

        {/* Back home */}
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
            background:     'rgba(255,255,255,0.08)',
            border:         '1px solid rgba(255,255,255,0.15)',
            color:          'rgba(255,255,255,0.75)',
            fontSize:       14,
            fontWeight:     600,
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
