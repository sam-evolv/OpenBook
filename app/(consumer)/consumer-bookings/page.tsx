'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import { createClient } from '@/lib/supabase/client'

/* ── Types ── */
interface BookingRow {
  id: string
  starts_at: string
  ends_at: string
  status: string | null
  price_cents: number
  service: { name: string; duration_minutes: number } | null
  business: { name: string; primary_colour: string | null; slug: string } | null
}

type Tab = 'upcoming' | 'past'

/* ── Status badge colours ── */
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: 'rgba(52,211,153,0.15)',  color: '#34d399', label: 'Confirmed' },
  completed: { bg: 'rgba(212,175,55,0.15)',  color: '#D4AF37', label: 'Completed' },
  cancelled: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Cancelled' },
  no_show:   { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', label: 'No show'   },
}

function statusStyle(status: string | null) {
  return STATUS_STYLE[status ?? ''] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', label: status ?? 'Unknown' }
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <div
      style={{
        background:   'rgba(255,255,255,0.06)',
        border:       '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding:      '14px 16px',
        display:      'flex',
        flexDirection: 'column',
        gap:          8,
      }}
    >
      <div style={{ height: 12, width: '55%', borderRadius: 6, background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ height: 10, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ height: 10, width: '30%', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

/* ── Format helpers ── */
function fmtDate(iso: string): string {
  const d      = new Date(iso)
  const today  = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return 'Today'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtPrice(cents: number): string {
  return `€${(cents / 100).toFixed(0)}`
}

export default function ConsumerBookingsPage() {
  const router = useRouter()
  const [bookings,  setBookings]  = useState<BookingRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [noAuth,    setNoAuth]    = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) setNoAuth(true)
          return
        }

        // Get customer id
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!customer) {
          if (!cancelled) setNoAuth(true)
          return
        }

        // Fetch bookings with service + business join
        const { data: rows } = await supabase
          .from('bookings')
          .select(`
            id,
            starts_at,
            ends_at,
            status,
            price_cents,
            service:service_id ( name, duration_minutes ),
            business:business_id ( name, primary_colour, slug )
          `)
          .eq('customer_id', customer.id)
          .order('starts_at', { ascending: false })

        if (!cancelled) {
          setBookings((rows ?? []) as unknown as BookingRow[])
        }
      } catch {
        // silently fail — show empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const now      = new Date()
  const upcoming = bookings.filter((b) => new Date(b.starts_at) > now && b.status !== 'cancelled')
  const past     = bookings.filter((b) => new Date(b.starts_at) <= now || b.status === 'cancelled')

  const displayed = activeTab === 'upcoming' ? upcoming : past

  /* ── Not logged in ── */
  if (noAuth) {
    return (
      <WallpaperBackground>
        <div className="min-h-screen pb-32" style={{ position: 'relative', zIndex: 1 }}>
          <div className="px-5 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>
              My Bookings
            </h1>
          </div>
          <div className="max-w-[390px] mx-auto px-5 pt-16 text-center">
            <p style={{ fontSize: 28, marginBottom: 10 }}>🔐</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Sign in to view bookings</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
              Your upcoming and past appointments will appear here.
            </p>
            <button
              onClick={() => router.push('/welcome?redirect=/consumer-bookings')}
              style={{
                height:       46,
                paddingLeft:  28,
                paddingRight: 28,
                borderRadius: 14,
                background:   '#D4AF37',
                border:       'none',
                cursor:       'pointer',
                fontSize:     15,
                fontWeight:   700,
                color:        '#1a1200',
              }}
            >
              Sign in
            </button>
          </div>
        </div>
        <GlassDock />
      </WallpaperBackground>
    )
  }

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div
          className="sticky top-0 z-20 px-5 pt-12 pb-4"
          style={{
            background:           'rgba(5,5,26,0.55)',
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
              margin:        '0 0 14px',
              lineHeight:    1,
            }}
          >
            My Bookings
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['upcoming', 'past'] as Tab[]).map((tab) => {
              const isActive = activeTab === tab
              const count    = tab === 'upcoming' ? upcoming.length : past.length
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    height:       32,
                    paddingLeft:  14,
                    paddingRight: 14,
                    borderRadius: 20,
                    background:   isActive ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                    border:       isActive ? 'none' : '1px solid rgba(255,255,255,0.13)',
                    color:        isActive ? '#000' : 'rgba(255,255,255,0.55)',
                    fontSize:     13,
                    fontWeight:   isActive ? 700 : 500,
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          6,
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {!loading && count > 0 && (
                    <span
                      style={{
                        height:       18,
                        paddingLeft:  6,
                        paddingRight: 6,
                        borderRadius: 9,
                        background:   isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)',
                        fontSize:     11,
                        fontWeight:   700,
                        color:        isActive ? '#000' : 'rgba(255,255,255,0.55)',
                        display:      'flex',
                        alignItems:   'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-[390px] mx-auto px-4 pt-4">

          {loading && (
            <div className="flex flex-col gap-3">
              {[0,1,2].map((i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {!loading && displayed.length === 0 && (
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
                marginTop:            8,
              }}
            >
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
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                  {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
                </p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', margin: 0, lineHeight: 1.5 }}>
                  {activeTab === 'upcoming'
                    ? 'Book a session at any business to see it here'
                    : 'Your completed appointments will appear here'}
                </p>
              </div>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => router.push('/explore')}
                  className="active:scale-95 transition-transform duration-150"
                  style={{
                    height:       46,
                    paddingLeft:  28,
                    paddingRight: 28,
                    borderRadius: 14,
                    background:   '#D4AF37',
                    border:       'none',
                    cursor:       'pointer',
                    fontSize:     15,
                    fontWeight:   700,
                    color:        '#1a1200',
                    boxShadow:    '0 4px 18px rgba(212,175,55,0.35)',
                  }}
                >
                  Explore businesses
                </button>
              )}
            </div>
          )}

          {!loading && displayed.length > 0 && (
            <div className="flex flex-col gap-3">
              {displayed.map((booking) => {
                const colour  = booking.business?.primary_colour ?? '#D4AF37'
                const st      = statusStyle(booking.status)
                return (
                  <div
                    key={booking.id}
                    style={{
                      background:           'rgba(255,255,255,0.06)',
                      backdropFilter:       'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                      border:               '1px solid rgba(255,255,255,0.1)',
                      borderRadius:         14,
                      padding:              '14px 16px',
                    }}
                  >
                    {/* Top row: service name + status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div
                        style={{
                          width:        8,
                          height:       8,
                          borderRadius: 4,
                          background:   colour,
                          flexShrink:   0,
                        }}
                      />
                      <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.service?.name ?? 'Booking'}
                      </p>
                      <span
                        style={{
                          height:       22,
                          paddingLeft:  8,
                          paddingRight: 8,
                          borderRadius: 6,
                          background:   st.bg,
                          color:        st.color,
                          fontSize:     11,
                          fontWeight:   700,
                          display:      'flex',
                          alignItems:   'center',
                          flexShrink:   0,
                        }}
                      >
                        {st.label}
                      </span>
                    </div>

                    {/* Meta rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Clock size={12} color="rgba(255,255,255,0.38)" />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                          {fmtDate(booking.starts_at)} · {fmtTime(booking.starts_at)}
                          {booking.service && ` · ${booking.service.duration_minutes} min`}
                        </span>
                      </div>
                      {booking.business && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <MapPin size={12} color="rgba(255,255,255,0.38)" />
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                            {booking.business.name}
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: colour }}>
                            {fmtPrice(booking.price_cents)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
