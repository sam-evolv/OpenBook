import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, transitions } from '../constants/theme'
import { useAuth } from '../lib/AuthContext'
import TabBar from '../components/TabBar'

export default function MeScreen() {
  const navigate = useNavigate()
  const { user, customer, loading, signInWithOtp, verifyOtp, signOut } = useAuth()

  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSendOtp() {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    const { error: err } = await signInWithOtp(email.trim())
    if (err) {
      setError(err)
    } else {
      setStep('otp')
    }
    setSending(false)
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) return
    setSending(true)
    setError(null)
    const { error: err } = await verifyOtp(email.trim(), otpCode.trim())
    if (err) {
      setError(err)
    }
    setSending(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
    setStep('email')
    setEmail('')
    setOtpCode('')
  }

  const initials = customer?.name
    ? customer.name.split(' ').map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transitions.spring}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: colors.bg, overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="safe-top" style={{ padding: '16px 20px 12px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.4, margin: 0 }}>Me</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: 12 }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ height: 16, width: 120, borderRadius: 8, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ height: 12, width: 160, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ) : user ? (
          /* Signed in state */
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 32px' }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(212,175,55,0.15)', border: '2px solid rgba(212,175,55,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#D4AF37', letterSpacing: -0.4 }}>{initials}</span>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{customer?.name ?? 'Welcome back'}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{user.email}</p>
              {memberSince && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>Member since {memberSince}</p>
              )}
            </div>

            {/* Menu items */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '&#128197;', label: 'My Bookings', sub: 'View upcoming & past appointments', href: '/bookings' },
                { icon: '&#11088;', label: 'Favourites', sub: 'Businesses you saved', href: null },
                { icon: '&#9881;', label: 'Settings', sub: 'Notifications, payments, account', href: null },
              ].map(({ icon, label, sub, href }) => (
                <button
                  key={label}
                  onClick={() => href && navigate(href)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: href ? 1 : 0.5,
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }} dangerouslySetInnerHTML={{ __html: icon }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{sub}</p>
                  </div>
                </button>
              ))}

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginTop: 4,
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 17l5-5-5-5M21 12H9" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: 0 }}>{signingOut ? 'Signing out...' : 'Sign out'}</p>
              </button>
            </div>
          </>
        ) : (
          /* Sign in flow */
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(212,175,55,0.12)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#D4AF37" strokeWidth="2" /><path d="M5 20c0-3.3 2.7-6 7-6s7 2.7 7 6" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Sign in to OpenBook</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: 32, textAlign: 'center' }}>
              Manage bookings, favourites & more
            </p>

            <div style={{ width: '100%', maxWidth: 340 }}>
              {step === 'email' ? (
                <>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    style={{ width: '100%', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', outline: 'none', marginBottom: 12 }}
                  />
                  {error && <p style={{ fontSize: 13, color: colors.red, marginBottom: 12 }}>{error}</p>}
                  <button
                    onClick={handleSendOtp}
                    disabled={sending || !email.trim()}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#D4AF37', color: '#000', fontSize: 15, fontWeight: 700, opacity: sending || !email.trim() ? 0.4 : 1 }}
                  >
                    {sending ? 'Sending...' : 'Send magic link'}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16, textAlign: 'center' }}>
                    We sent a code to <strong style={{ color: '#fff' }}>{email}</strong>
                  </p>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    style={{ width: '100%', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', outline: 'none', marginBottom: 12, textAlign: 'center', letterSpacing: 8, fontWeight: 700 }}
                  />
                  {error && <p style={{ fontSize: 13, color: colors.red, marginBottom: 12 }}>{error}</p>}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={sending || !otpCode.trim()}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#D4AF37', color: '#000', fontSize: 15, fontWeight: 700, opacity: sending || !otpCode.trim() ? 0.4 : 1, marginBottom: 12 }}
                  >
                    {sending ? 'Verifying...' : 'Verify code'}
                  </button>
                  <button onClick={() => { setStep('email'); setError(null) }} style={{ width: '100%', padding: '12px', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <TabBar />
    </motion.div>
  )
}
