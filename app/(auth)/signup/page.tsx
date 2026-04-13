'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tokens } from '@/lib/types'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
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
        <div className="text-center mb-10">
          <span className="text-2xl font-black tracking-tight" style={{ color: tokens.gold }}>
            OpenBook
          </span>
          <p className="mt-2 text-sm" style={{ color: tokens.text2 }}>
            Start taking bookings in minutes
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border2}` }}
          >
            <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
            <p className="text-sm" style={{ color: tokens.text2 }}>
              Magic link sent to <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-8"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border2}` }}
          >
            <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-sm mb-8" style={{ color: tokens.text2 }}>
              Enter your email to get started — you&apos;ll be set up in 5 minutes.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: tokens.text2 }}>
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/20"
                  style={{
                    background: tokens.surface2,
                    border: `1px solid ${tokens.border2}`,
                  }}
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: tokens.gold, color: '#000' }}
              >
                {loading ? 'Sending…' : 'Get started free'}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: tokens.text3 }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: tokens.gold }}>
                Sign in
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
