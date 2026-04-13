'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, MapPin, CalendarPlus, Home, Mail, User, AlertCircle, CreditCard } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import { createClient } from '@/lib/supabase/client'

/* ── Stripe instance (lazy-loaded once) ── */
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null

/* ────────────────────────────────────────────────────────────── */
/* Guest checkout form                                             */
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

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 44, borderRadius: 10,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)',
          paddingLeft: 12, paddingRight: 12, marginBottom: 10,
        }}
      >
        <User size={15} color="rgba(255,255,255,0.38)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#fff', fontWeight: 500 }}
        />
      </div>

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 44, borderRadius: 10,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)',
          paddingLeft: 12, paddingRight: 12, marginBottom: 14,
        }}
      >
        <Mail size={15} color="rgba(255,255,255,0.38)" style={{ flexShrink: 0 }} />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#fff', fontWeight: 500 }}
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
          width: '100%', height: 44, borderRadius: 12,
          background:   name.trim() && email.trim() ? colour : colour + '55',
          color:        '#000', fontSize: 14, fontWeight: 800, border: 'none',
          cursor:       name.trim() && email.trim() ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? <Spinner /> : 'Continue'}
      </button>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Stripe card payment form                                        */
/* ────────────────────────────────────────────────────────────── */
function StripePaymentForm({
  colour,
  priceCents,
  onSuccess,
  onError,
}: {
  colour: string
  priceCents: number
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message ?? 'Payment failed')
      setPaying(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} className="w-full max-w-sm">
      <div
        style={{
          background:           'rgba(255,255,255,0.07)',
          backdropFilter:       'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border:               '1px solid rgba(255,255,255,0.11)',
          borderRadius:         16,
          padding:              '20px 18px',
          marginBottom:         16,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} color="rgba(255,255,255,0.5)" />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Card payment</p>
          <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: colour }}>
            €{(priceCents / 100).toFixed(0)}
          </span>
        </div>

        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={paying || !stripe}
        className="active:scale-[0.97] transition-transform duration-150 w-full"
        style={{
          height: 48, borderRadius: 14,
          background: paying ? colour + '88' : colour,
          color: '#000', fontSize: 15, fontWeight: 800, border: 'none',
          cursor: paying ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {paying ? <Spinner /> : <>Pay & confirm booking</>}
      </button>
    </form>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Small spinner                                                   */
/* ────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <>
      <div
        style={{
          width: 16, height: 16, borderRadius: 8,
          border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Types                                                           */
/* ────────────────────────────────────────────────────────────── */
type Phase =
  | 'checking'          // detecting auth + business stripe status
  | 'guest-form'        // anonymous user — collect name + email
  | 'stripe-payment'    // business has Stripe → show card form
  | 'creating'          // calling /api/bookings/create
  | 'success'
  | 'error'

/* ────────────────────────────────────────────────────────────── */
/* Main confirm content                                            */
/* ────────────────────────────────────────────────────────────── */
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

  const [phase,           setPhase]          = useState<Phase>('checking')
  const [errorMsg,        setErrorMsg]       = useState('')
  const [guestErr,        setGuestErr]       = useState('')
  const [creating,        setCreating]       = useState(false)
  const [customerId,      setCustomerId]     = useState<string | null>(null)
  const [clientSecret,    setClientSecret]   = useState<string | null>(null)
  const [priceCents,      setPriceCents]     = useState(0)
  const [hasStripe,       setHasStripe]      = useState(false)

  /* ── On mount: determine auth + Stripe status ── */
  useEffect(() => {
    let cancelled = false

    async function check() {
      // No DB IDs → show success immediately (mock flow)
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

        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!customer) {
          setPhase('guest-form')
          return
        }

        if (!cancelled) {
          setCustomerId(customer.id)
          await initiateBooking(customer.id)
        }
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

  /* ── Initiate booking: check for Stripe, create payment intent or book direct ── */
  const initiateBooking = useCallback(async (custId: string) => {
    try {
      // Fetch business to check stripe_account_id and get service price
      const supabase = createClient()
      const [{ data: biz }, { data: svc }] = await Promise.all([
        supabase.from('businesses').select('stripe_account_id').eq('id', businessId).single(),
        supabase.from('services').select('price_cents').eq('id', serviceDbId).single(),
      ])

      const svcPriceCents = svc?.price_cents ?? 0
      setPriceCents(svcPriceCents)

      if (biz?.stripe_account_id && stripePromise && svcPriceCents > 0) {
        // Business has Stripe → create payment intent first
        setHasStripe(true)
        const res = await fetch('/api/stripe/payment-intent', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            business_id:  businessId,
            service_id:   serviceDbId,
            customer_id:  custId,
          }),
        })

        if (!res.ok) throw new Error('Could not create payment session')
        const json = await res.json()
        setClientSecret(json.clientSecret)
        setPhase('stripe-payment')
      } else {
        // No Stripe → create booking directly
        await createBooking(custId)
      }
    } catch (err: unknown) {
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : 'Could not prepare booking')
    }
  }, [businessId, serviceDbId])

  /* ── Create booking in DB ── */
  async function createBooking(custId: string) {
    setCreating(true)
    setPhase('creating')

    try {
      const startsAt = buildStartsAt(date, time)
      const res = await fetch('/api/bookings/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_id: businessId,
          service_id:  serviceDbId,
          customer_id: custId,
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

  /* ── Guest form submit ── */
  async function handleGuestSubmit(name: string, email: string) {
    setGuestErr('')
    setCreating(true)

    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .single()

      let custId: string
      if (existing) {
        custId = existing.id
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('customers')
          .insert({ name: name.trim(), email: email.trim().toLowerCase() })
          .select('id')
          .single()
        if (insErr || !inserted) throw new Error('Could not create your account')
        custId = inserted.id
      }

      setCustomerId(custId)
      await initiateBooking(custId)
    } catch (err: unknown) {
      setGuestErr(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  /* ── Stripe payment succeeded ── */
  async function handlePaymentSuccess() {
    if (customerId) {
      await createBooking(customerId)
    }
  }

  /* ─────────── Render phases ─────────── */

  if (phase === 'checking' || phase === 'creating') {
    return (
      <WallpaperBackground>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, border: '3px solid rgba(212,175,55,0.3)', borderTopColor: '#D4AF37', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {phase === 'creating' ? 'Confirming your booking…' : 'Just a moment…'}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </WallpaperBackground>
    )
  }

  if (phase === 'error') {
    return (
      <WallpaperBackground>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20 gap-4" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={36} color="#ef4444" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Booking failed</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', margin: 0 }}>{errorMsg}</p>
          <button
            onClick={() => router.back()}
            style={{ marginTop: 8, height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </WallpaperBackground>
    )
  }

  if (phase === 'guest-form') {
    return (
      <WallpaperBackground>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px', textAlign: 'center' }}>
            Almost there
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 24 }}>
            Enter your details to confirm your booking.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: colour + '22', border: `1px solid ${colour}44`, marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: colour, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{service}</span>
            {time && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>· {time}</span>}
            {price && <span style={{ fontSize: 13, fontWeight: 800, color: colour }}>· €{price}</span>}
          </div>
          <GuestForm colour={colour} onSubmit={handleGuestSubmit} loading={creating} error={guestErr} />
          <button
            onClick={() => router.push('/welcome?redirect=' + encodeURIComponent('/booking/confirm?' + (searchParams?.toString() ?? '')))}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Already have an account? Sign in →
          </button>
        </div>
      </WallpaperBackground>
    )
  }

  if (phase === 'stripe-payment' && clientSecret && stripePromise) {
    return (
      <WallpaperBackground>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px', textAlign: 'center' }}>
            Complete payment
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 28 }}>
            {service}{business ? ` at ${business}` : ''}
          </p>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: { colorPrimary: colour },
              },
            }}
          >
            <StripePaymentForm
              colour={colour}
              priceCents={priceCents}
              onSuccess={handlePaymentSuccess}
              onError={(msg) => { setPhase('error'); setErrorMsg(msg) }}
            />
          </Elements>
          <button
            onClick={() => router.back()}
            style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Cancel
          </button>
        </div>
      </WallpaperBackground>
    )
  }

  /* ── Success ── */
  return (
    <WallpaperBackground>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ position: 'relative', zIndex: 1 }}>

        <div className="relative mb-6">
          <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={42} color="#34d399" strokeWidth={1.5} />
          </div>
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(52,211,153,0.08)' }} />
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 6px', textAlign: 'center' }}>
          You&apos;re booked.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 28 }}>
          {hasStripe ? 'Payment confirmed. ' : ''}A confirmation has been sent to your email.
        </p>

        <div
          className="w-full max-w-sm"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 16, padding: '18px 18px', marginBottom: 28 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 10, height: 10, borderRadius: 5, background: colour, flexShrink: 0, boxShadow: `0 0 8px ${colour}88` }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{service}</p>
            {price && <p style={{ fontSize: 14, fontWeight: 800, color: colour, margin: '0 0 0 auto', flexShrink: 0 }}>€{price}</p>}
          </div>

          {time && (
            <div className="flex items-center gap-2.5 mb-3">
              <Clock size={13} color="rgba(255,255,255,0.42)" />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{formatDisplayDate(date)} · {time}</p>
            </div>
          )}

          {business && (
            <div className="flex items-center gap-2.5">
              <MapPin size={13} color="rgba(255,255,255,0.42)" />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{business}</p>
            </div>
          )}
        </div>

        <button
          className="active:scale-95 transition-transform duration-150"
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 12, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}
        >
          <CalendarPlus size={15} />
          Add to calendar
        </button>

        <button
          onClick={() => router.push('/home')}
          className="active:scale-95 transition-transform duration-150"
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          <Home size={15} />
          Back to home
        </button>

      </div>
    </WallpaperBackground>
  )
}

/* ── Helpers ── */

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
    const d = new Date(dateStr + 'T12:00:00')
    if (dateStr === today.toISOString().slice(0, 10))    return 'Today'
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow'
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
