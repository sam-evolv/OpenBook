'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tokens } from '@/lib/types'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/overview` },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: tokens.bg }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span
            className="text-2xl font-black tracking-tight"
            style={{ color: tokens.gold }}
          >
            OpenBook
          </span>
          <p className="mt-2 text-sm" style={{ color: tokens.text2 }}>
            Business dashboard
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border2}` }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${tokens.gold}20` }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"
                  stroke={tokens.gold}
                  strokeWidth="1.5"
                />
                <path d="M22 6l-10 7L2 6" stroke={tokens.gold} strokeWidth="1.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
            <p className="text-sm" style={{ color: tokens.text2 }}>
              We sent a magic link to <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-8"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border2}` }}
          >
            <h1 className="text-xl font-bold text-white mb-1">Sign in</h1>
            <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
              We&apos;ll send you a magic link — no password needed.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: tokens.text2 }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:ring-1"
                  style={{
                    background: tokens.surface2,
                    border: `1px solid ${tokens.border2}`,
                    // @ts-expect-error custom prop
                    '--tw-ring-color': tokens.gold,
                  }}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: tokens.gold, color: '#000' }}
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: tokens.text3 }}>
              New business?{' '}
              <a href="/signup" style={{ color: tokens.gold }}>
                Create account
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
