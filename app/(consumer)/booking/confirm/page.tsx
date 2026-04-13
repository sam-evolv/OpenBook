'use client'

<<<<<<< Updated upstream
import { useRouter } from 'next/navigation'
import { CheckCircle, MapPin, Clock, Home } from 'lucide-react'
=======
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, MapPin, CalendarPlus, Home, Mail, User, AlertCircle } from 'lucide-react'
>>>>>>> Stashed changes
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import { createClient } from '@/lib/supabase/client'

/* ────────────────────────────────────────────────────────────── */
/* Guest checkout form — shown when user is anonymous             */
/* ────────────────────────────────────────────────────────────── */
function GuestForm({
  colour,
  onSubmit,
  loading,
  error,
}: {
  colour: string
  onSubmit: (name: string, email: string) => void
  loading: boolean
  error: string
}) {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')

  return (
    <div
      className="w-full max-w-sm"
      style={{
        background:           'rgba(255,255,255,0.07)',
        backdropFilter:       'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border:               '1px solid rgba(255,255,255,0.11)',
        borderRadius:         16,
        padding:              '20px 18px',
        marginBottom:         20,
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.01em' }}>
        Your details
      </p>

      {/* Name */}
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          height:        44,
          borderRadius:  10,
          background:    'rgba(255,255,255,0.08)',
          border:        '1px solid rgba(255,255,255,0.13)',
          paddingLeft:   12,
          paddingRight:  12,
          marginBottom:  10,
        }}
      >
        <User size={15} color="rgba(255,255,255,0.38)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{
            flex:       1,
            background: 'none',
            border:     'none',
            outline:    'none',
            fontSize:   14,
            color:      '#fff',
            fontWeight: 500,
          }}
        />
      </div>

      {/* Email */}
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          height:        44,
          borderRadius:  10,
          background:    'rgba(255,255,255,0.08)',
          border:        '1px solid rgba(255,255,255,0.13)',
          paddingLeft:   12,
          paddingRight:  12,
          marginBottom:  14,
        }}
      >
        <Mail size={15} color="rgba(255,255,255,0.38)" style={{ flexShrink: 0 }} />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{
            flex:       1,
            background: 'none',
            border:     'none',
            outline:    'none',
            fontSize:   14,
            color:      '#fff',
            fontWeight: 500,
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.9)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <button
        onClick={() => onSubmit(name, email)}
        disabled={loading || !name.trim() || !email.trim()}
        className="active:scale-[0.97] transition-transform duration-150"
        style={{
          width:        '100%',
          height:       44,
          borderRadius: 12,
          background:   name.trim() && email.trim() ? colour : colour + '55',
          color:        '#000',
          fontSize:     14,
          fontWeight:   800,
          border:       'none',
          cursor:       name.trim() && email.trim() ? 'pointer' : 'not-allowed',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          gap:          8,
        }}
      >
        {loading ? (
          <div
            style={{
              width:        16,
              height:       16,
              borderRadius: 8,
              border:       '2px solid rgba(0,0,0,0.3)',
              borderTopColor: '#000',
              animation:    'spin 0.7s linear infinite',
            }}
          />
        ) : 'Confirm booking'}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Main content                                                    */
/* ────────────────────────────────────────────────────────────── */
type Phase = 'checking' | 'guest-form' | 'creating' | 'success' | 'error'

<<<<<<< Updated upstream
export default function BookingConfirmPage() {
  const router = useRouter()
=======
function ConfirmContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const service     = searchParams?.get('service')     ?? 'Your booking'
  const time        = searchParams?.get('time')        ?? ''
  const business    = searchParams?.get('business')    ?? ''
  const price       = searchParams?.get('price')       ?? ''
  const colour      = searchParams?.get('colour')      ?? '#D4AF37'
  const businessId  = searchParams?.get('businessId')  ?? ''
  const serviceDbId = searchParams?.get('serviceDbId') ?? ''
  const date        = searchParams?.get('date')        ?? new Date().toISOString().slice(0, 10)
>>>>>>> Stashed changes

  const [phase,     setPhase]     = useState<Phase>('checking')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [guestErr,  setGuestErr]  = useState('')
  const [creating,  setCreating]  = useState(false)

  /* ── On mount: check auth state ── */
  useEffect(() => {
    let cancelled = false
    async function check() {
      // If no DB IDs, we can't create a real booking — show success immediately
      if (!businessId || !serviceDbId) {
        if (!cancelled) setPhase('success')
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (cancelled) return

        if (!user) {
          setPhase('guest-form')
          return
        }

        // Logged-in user — get or create customer then book
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!customer) {
          setPhase('guest-form')
          return
        }

        await createBooking(customer.id)
      } catch {
        if (!cancelled) {
          setPhase('error')
          setErrorMsg('Could not check your session. Please try again.')
        }
      }
    }
    check()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createBooking(customerId: string) {
    setCreating(true)
    setPhase('creating')

    try {
      // Build starts_at from date + time
      const startsAt = buildStartsAt(date, time)

      const res = await fetch('/api/bookings/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id:  serviceDbId,
          customer_id: customerId,
          starts_at:   startsAt,
          source:      'consumer-app',
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Booking failed')
      }

      setPhase('success')
    } catch (err: unknown) {
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : 'Booking failed. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function handleGuestSubmit(name: string, email: string) {
    setGuestErr('')
    setCreating(true)

    try {
      const supabase = createClient()

      // Check if customer exists by email
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single()

      let customerId: string

      if (existing) {
        customerId = existing.id
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('customers')
          .insert({
            name:  name.trim(),
            email: email.trim().toLowerCase(),
          })
          .select('id')
          .single()

        if (insErr || !inserted) throw new Error('Could not create your account')
        customerId = inserted.id
      }

      await createBooking(customerId)
    } catch (err: unknown) {
      setGuestErr(err instanceof Error ? err.message : 'Something went wrong')
      setCreating(false)
    }
  }

  /* ── Loading / creating spinner ── */
  if (phase === 'checking' || phase === 'creating') {
    return (
      <WallpaperBackground>
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div
            style={{
              width:          48,
              height:         48,
              borderRadius:   24,
              border:         '3px solid rgba(212,175,55,0.3)',
              borderTopColor: '#D4AF37',
              animation:      'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {phase === 'creating' ? 'Confirming your booking…' : 'Just a moment…'}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </WallpaperBackground>
    )
  }

  /* ── Error state ── */
  if (phase === 'error') {
    return (
      <WallpaperBackground>
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 pb-20 gap-4"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div
            style={{
              width:          72,
              height:         72,
              borderRadius:   36,
              background:     'rgba(239,68,68,0.12)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={36} color="#ef4444" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            Booking failed
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', margin: 0 }}>
            {errorMsg}
          </p>
          <button
            onClick={() => router.back()}
            style={{
              marginTop:    8,
              height:       44,
              paddingLeft:  24,
              paddingRight: 24,
              borderRadius: 12,
              background:   'rgba(255,255,255,0.1)',
              border:       '1px solid rgba(255,255,255,0.18)',
              color:        '#fff',
              fontSize:     14,
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </WallpaperBackground>
    )
  }

  /* ── Guest form state ── */
  if (phase === 'guest-form') {
    return (
      <WallpaperBackground>
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h1
            style={{
              fontSize:      24,
              fontWeight:    900,
              color:         '#fff',
              letterSpacing: '-0.03em',
              margin:        '0 0 6px',
              textAlign:     'center',
            }}
          >
            Almost there
          </h1>
          <p
            style={{
              fontSize:     14,
              color:        'rgba(255,255,255,0.45)',
              textAlign:    'center',
              marginBottom: 24,
            }}
          >
            Enter your details to confirm your booking.
          </p>

          {/* Booking summary pill */}
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '8px 14px',
              borderRadius: 20,
              background:   colour + '22',
              border:       `1px solid ${colour}44`,
              marginBottom: 20,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: colour, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{service}</span>
            {time && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>· {time}</span>}
            {price && <span style={{ fontSize: 13, fontWeight: 800, color: colour }}>· €{price}</span>}
          </div>

          <GuestForm colour={colour} onSubmit={handleGuestSubmit} loading={creating} error={guestErr} />

          <button
            onClick={() => router.push('/welcome?redirect=' + encodeURIComponent('/booking/confirm?' + searchParams!.toString()))}
            style={{
              fontSize:   13,
              color:      'rgba(255,255,255,0.35)',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
            }}
          >
            Already have an account? Sign in →
          </button>
        </div>
      </WallpaperBackground>
    )
  }

  /* ── Success state ── */
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
<<<<<<< Updated upstream
=======

          {/* Time row */}
          {time && (
            <div className="flex items-center gap-2.5 mb-3">
              <Clock size={13} color="rgba(255,255,255,0.42)" />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                {formatDisplayDate(date)} · {time}
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

/* ── Helpers ── */

/** Build ISO 8601 starts_at from a YYYY-MM-DD date and "h:mm am/pm" time */
function buildStartsAt(dateStr: string, timeStr: string): string {
  try {
    const match = timeStr.match(/^(\d+):(\d+)\s*(am|pm)$/i)
    if (!match) return new Date(`${dateStr}T09:00:00`).toISOString()
    let h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    const period = match[3].toLowerCase()
    if (period === 'pm' && h !== 12) h += 12
    if (period === 'am' && h === 12) h = 0
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    return new Date(`${dateStr}T${hh}:${mm}:00`).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const today    = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const d = new Date(dateStr + 'T12:00:00') // noon to avoid TZ issues
    const todayStr    = today.toISOString().slice(0, 10)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    if (dateStr === todayStr)    return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return 'Today'
  }
}

export default function BookingConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
>>>>>>> Stashed changes
