'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Star, CalendarDays, LogOut, User } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import GlassDock from '@/components/consumer/GlassDock'
import { createClient } from '@/lib/supabase/client'

interface CustomerProfile {
  id: string
  name: string | null
  email: string | null
  bookingCount: number
}

const MENU_ITEMS = [
  { icon: CalendarDays, label: 'My bookings',     sub: 'View upcoming & past appointments', href: '/consumer-bookings' },
  { icon: Star,         label: 'Favourites',       sub: 'Businesses you saved',              href: null },
  { icon: Settings,     label: 'Settings',         sub: 'Notifications, payments, account',  href: null },
]

export default function MePage() {
  const router = useRouter()
  const [profile,  setProfile]  = useState<CustomerProfile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) setLoading(false)
          return
        }

        // Load customer record
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('user_id', user.id)
          .single()

        if (cancelled) return

        if (customer) {
          // Count bookings
          const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customer.id)

          if (!cancelled) {
            setProfile({
              id:           customer.id,
              name:         customer.name,
              email:        customer.email ?? user.email ?? null,
              bookingCount: count ?? 0,
            })
          }
        }
      } catch {
        // silently ignore — show guest state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/welcome')
    } catch {
      setSigningOut(false)
    }
  }

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
    : '?'

  return (
    <WallpaperBackground>
      <div className="min-h-screen pb-32">
        <div className="px-5 pt-14 pb-5">
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Me
          </h1>
        </div>

        {/* ── Profile section ── */}
        <div className="flex flex-col items-center px-5 pt-4 pb-8">
          {loading ? (
            /* Loading skeleton */
            <>
              <div
                style={{
                  width:     80,
                  height:    80,
                  borderRadius: 40,
                  background: 'rgba(255,255,255,0.08)',
                  marginBottom: 12,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div style={{ height: 16, width: 120, borderRadius: 8, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />
              <div style={{ height: 12, width: 160, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
              <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
            </>
          ) : profile ? (
            /* Logged-in state */
            <>
              <div
                style={{
                  width:          80,
                  height:         80,
                  borderRadius:   40,
                  background:     'rgba(212,175,55,0.15)',
                  border:         '2px solid rgba(212,175,55,0.35)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  marginBottom:   12,
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.02em' }}>
                  {initials}
                </span>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                {profile.name ?? 'Welcome back'}
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
                {profile.email}
              </p>
              {profile.bookingCount > 0 && (
                <div
                  style={{
                    marginTop:    10,
                    height:       26,
                    paddingLeft:  12,
                    paddingRight: 12,
                    borderRadius: 20,
                    background:   'rgba(212,175,55,0.12)',
                    border:       '1px solid rgba(212,175,55,0.25)',
                    display:      'flex',
                    alignItems:   'center',
                    fontSize:     12,
                    fontWeight:   600,
                    color:        '#D4AF37',
                  }}
                >
                  {profile.bookingCount} booking{profile.bookingCount !== 1 ? 's' : ''}
                </div>
              )}
            </>
          ) : (
            /* Guest / not logged in */
            <>
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
                onClick={() => router.push('/welcome')}
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
            </>
          )}
        </div>

        {/* ── Menu items ── */}
        <div className="px-4 flex flex-col gap-2">
          {MENU_ITEMS.map(({ icon: Icon, label, sub, href }) => (
            <button
              key={label}
              onClick={() => href && router.push(href)}
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
                cursor:               href ? 'pointer' : 'default',
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

          {/* ── Sign out ── */}
          {profile && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-left active:scale-[0.98] transition-transform duration-150 w-full"
              style={{
                background:           'rgba(239,68,68,0.07)',
                backdropFilter:       'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border:               '1px solid rgba(239,68,68,0.18)',
                borderRadius:         12,
                padding:              '14px 16px',
                display:              'flex',
                alignItems:           'center',
                gap:                  14,
                cursor:               'pointer',
                marginTop:            4,
              }}
            >
              <div
                style={{
                  width:          38,
                  height:         38,
                  borderRadius:   12,
                  background:     'rgba(239,68,68,0.1)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                <LogOut size={18} color="#ef4444" strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: 0 }}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      <GlassDock />
    </WallpaperBackground>
  )
}
