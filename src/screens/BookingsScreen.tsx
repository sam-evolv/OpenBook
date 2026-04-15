import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, radius, transitions } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatPrice, formatDate, formatTime } from '../lib/utils'
import TabBar from '../components/TabBar'

interface BookingWithDetails {
  id: string
  starts_at: string
  ends_at: string
  price_cents: number
  status: string | null
  businesses: { name: string; slug: string; primary_colour: string | null } | null
  services: { name: string; duration_minutes: number } | null
}

export default function BookingsScreen() {
  const navigate = useNavigate()
  const { user, customer, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!customer) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('id, starts_at, ends_at, price_cents, status, businesses(name, slug, primary_colour), services(name, duration_minutes)')
        .eq('customer_id', customer!.id)
        .order('starts_at', { ascending: false })
        .limit(50)

      if (!cancelled) {
        setBookings((data ?? []) as unknown as BookingWithDetails[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [customer, authLoading])

  const now = new Date().toISOString()
  const upcoming = bookings.filter((b) => b.starts_at >= now && b.status === 'confirmed')
  const past = bookings.filter((b) => b.starts_at < now || b.status !== 'confirmed')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transitions.spring}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: colors.bg, overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="safe-top" style={{ padding: '16px 20px 12px', background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.4, margin: 0 }}>My Bookings</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {authLoading || loading ? (
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        ) : !user || !customer ? (
          /* Not signed in */
          <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M3 9h18" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M8 2v4M16 2v4" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Sign in to see bookings</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Your upcoming and past bookings will appear here</p>
            <button
              onClick={() => navigate('/me')}
              style={{ marginTop: 8, height: 46, padding: '0 28px', borderRadius: 14, background: '#D4AF37', color: '#1a1200', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 18px rgba(212,175,55,0.35)' }}
            >
              Sign in
            </button>
          </div>
        ) : bookings.length === 0 ? (
          /* Empty state */
          <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M3 9h18" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M8 2v4M16 2v4" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>No bookings yet</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Book a session at any business to see it here</p>
            <button
              onClick={() => navigate('/explore')}
              style={{ marginTop: 8, height: 46, padding: '0 28px', borderRadius: 14, background: '#D4AF37', color: '#1a1200', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 18px rgba(212,175,55,0.35)' }}
            >
              Explore businesses
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px 16px' }}>
            {upcoming.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Upcoming</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcoming.map((b) => (
                    <BookingCard key={b.id} booking={b} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>Past</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} navigate={navigate} isPast />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <TabBar />
    </motion.div>
  )
}

function BookingCard({ booking, navigate, isPast }: { booking: BookingWithDetails; navigate: (path: string) => void; isPast?: boolean }) {
  const accent = booking.businesses?.primary_colour ?? '#D4AF37'
  const startDate = new Date(booking.starts_at)
  const timeStr = booking.starts_at.split('T')[1]?.slice(0, 5) ?? ''

  const statusColors: Record<string, string> = {
    confirmed: colors.green,
    cancelled: colors.red,
    completed: 'rgba(255,255,255,0.4)',
    no_show: colors.red,
  }

  return (
    <button
      onClick={() => booking.businesses?.slug && navigate(`/business/${booking.businesses.slug}`)}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 16,
        padding: '16px 18px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        opacity: isPast ? 0.6 : 1,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
      }}
    >
      {/* Date badge */}
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${accent}15`, border: `1px solid ${accent}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase' }}>
          {startDate.toLocaleDateString('en-IE', { month: 'short' })}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {startDate.getDate()}
        </span>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.businesses?.name ?? 'Business'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          {booking.services?.name ?? 'Service'} · {timeStr}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{formatPrice(booking.price_cents)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColors[booking.status ?? 'confirmed'] ?? 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
            {booking.status ?? 'confirmed'}
          </span>
        </div>
      </div>
    </button>
  )
}
