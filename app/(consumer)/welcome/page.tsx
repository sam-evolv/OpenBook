'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'
import WallpaperBackground from '@/components/consumer/WallpaperBackground'
import { createClient } from '@/lib/supabase/client'

function WelcomeContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams?.get('redirect') ?? '/home'

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const origin   = window.location.origin
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (otpErr) throw otpErr
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <WallpaperBackground>
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-20"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* ── Wordmark ── */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h1
            style={{
              fontSize:      38,
              fontWeight:    900,
              color:         '#fff',
              letterSpacing: '-0.04em',
              margin:        '0 0 8px',
              lineHeight:    1,
            }}
          >
            OpenBook
            <span style={{ color: '#D4AF37' }}> AI</span>
          </h1>
          <p
            style={{
              fontSize:  15,
              color:     'rgba(255,255,255,0.42)',
              fontWeight: 400,
              margin:    0,
            }}
          >
            Book anything, anywhere.
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="w-full max-w-sm"
          style={{
            background:           'rgba(255,255,255,0.07)',
            backdropFilter:       'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border:               '1px solid rgba(255,255,255,0.11)',
            borderRadius:         20,
            padding:              '28px 24px',
          }}
        >
          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width:          56,
                  height:         56,
                  borderRadius:   28,
                  background:     'rgba(52,211,153,0.15)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  marginBottom:   4,
                }}
              >
                <CheckCircle size={28} color="#34d399" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Check your email
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', margin: 0, lineHeight: 1.5 }}>
                We sent a magic link to<br />
                <strong style={{ color: 'rgba(255,255,255,0.80)' }}>{email}</strong>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', margin: '8px 0 0' }}>
                Tap the link in your email to sign in.
              </p>
            </div>
          ) : (
            /* ── Email form ── */
            <>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Sign in
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px' }}>
                We&apos;ll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleSubmit}>
                {/* Email input */}
                <div
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           10,
                    height:        48,
                    borderRadius:  12,
                    background:    'rgba(255,255,255,0.08)',
                    border:        error ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.13)',
                    paddingLeft:   14,
                    paddingRight:  14,
                    marginBottom:  error ? 8 : 16,
                  }}
                >
                  <Mail size={16} color="rgba(255,255,255,0.38)" style={{ flexShrink: 0 }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoFocus
                    style={{
                      flex:        1,
                      background:  'none',
                      border:      'none',
                      outline:     'none',
                      fontSize:    15,
                      color:       '#fff',
                      fontWeight:  500,
                    }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.9)', margin: '0 0 14px' }}>
                    {error}
                  </p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="active:scale-[0.97] transition-transform duration-150"
                  style={{
                    width:        '100%',
                    height:       48,
                    borderRadius: 14,
                    background:   email.trim() ? '#D4AF37' : 'rgba(212,175,55,0.3)',
                    color:        email.trim() ? '#000' : 'rgba(0,0,0,0.5)',
                    fontSize:     15,
                    fontWeight:   800,
                    border:       'none',
                    cursor:       email.trim() ? 'pointer' : 'not-allowed',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    gap:          8,
                    transition:   'background 0.2s',
                  }}
                >
                  {loading ? (
                    <div
                      style={{
                        width:          18,
                        height:         18,
                        borderRadius:   9,
                        border:         '2.5px solid rgba(0,0,0,0.3)',
                        borderTopColor: '#000',
                        animation:      'spin 0.7s linear infinite',
                      }}
                    />
                  ) : (
                    <>
                      Continue with email
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </form>
            </>
          )}
        </div>

        {/* ── Guest link ── */}
        {!sent && (
          <button
            onClick={() => router.push('/explore')}
            style={{
              marginTop:  24,
              fontSize:   14,
              fontWeight: 500,
              color:      'rgba(255,255,255,0.38)',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              display:    'flex',
              alignItems: 'center',
              gap:        6,
            }}
          >
            Or continue as guest
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </WallpaperBackground>
  )
}

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeContent />
    </Suspense>
  )
}
