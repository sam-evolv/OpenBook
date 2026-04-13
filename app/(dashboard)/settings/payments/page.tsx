'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle, XCircle, ExternalLink, Unlink } from 'lucide-react'
import { tokens } from '@/lib/types'

interface ConnectStatus {
  connected:        boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  account_id?:      string
}

function PaymentsContent() {
  const searchParams = useSearchParams()

  const [status,       setStatus]       = useState<ConnectStatus | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  // Show toast if returning from Stripe callback
  const justConnected = searchParams?.get('connected') === '1'

  useEffect(() => {
    fetch('/api/stripe/connect')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false))
  }, [])

  async function handleConnect() {
    // Navigate to start route — it will redirect to Stripe
    window.location.href = '/api/stripe/connect/start'
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Stripe? Payments will stop working.')) return
    setDisconnecting(true)

    try {
      await fetch('/api/stripe/connect', { method: 'DELETE' })
      setStatus({ connected: false })
    } catch {
      // no-op
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Payments</h1>
        <p className="text-sm" style={{ color: tokens.text3 }}>
          Accept card payments from customers directly via Stripe Connect.
        </p>
      </div>

      {justConnected && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <CheckCircle size={16} color="#22c55e" />
          <p className="text-sm font-medium" style={{ color: '#22c55e' }}>
            Stripe account connected successfully!
          </p>
        </div>
      )}

      {/* ── Platform fee card ── */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(212,175,55,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 900, color: tokens.gold }}>%</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">OpenBook takes 5% per booking</p>
            <p className="text-xs" style={{ color: tokens.text3 }}>
              Automatically deducted from each payment. Funds land in your bank account within 2 business days.
            </p>
          </div>
        </div>
      </div>

      {/* ── Connect status card ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-3 w-60 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ) : status?.connected ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(34,197,94,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <CheckCircle size={18} color="#22c55e" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Stripe account connected</p>
                  <p className="text-xs" style={{ color: tokens.text3 }}>Accepting live payments</p>
                </div>
              </div>

              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color:      tokens.text2,
                  background: 'rgba(255,255,255,0.06)',
                  border:     `1px solid ${tokens.border}`,
                  textDecoration: 'none',
                }}
              >
                Stripe dashboard
                <ExternalLink size={11} />
              </a>
            </div>

            {/* Status rows */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${tokens.border}` }}
            >
              <StatusRow
                label="Charges enabled"
                ok={status.charges_enabled}
                value={status.charges_enabled ? 'Yes — accepting payments' : 'Pending verification'}
              />
              <StatusRow
                label="Payouts enabled"
                ok={status.payouts_enabled}
                value={status.payouts_enabled ? 'Yes — funds transferred automatically' : 'Pending'}
                last
              />
            </div>

            {status.account_id && (
              <p className="text-xs font-mono" style={{ color: tokens.text3 }}>
                Account: {status.account_id}
              </p>
            )}

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border:     '1px solid rgba(239,68,68,0.2)',
                color:      '#ef4444',
                cursor:     'pointer',
              }}
            >
              <Unlink size={14} />
              {disconnecting ? 'Disconnecting…' : 'Disconnect Stripe'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <XCircle size={18} color={tokens.text3} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Not connected</p>
                <p className="text-xs" style={{ color: tokens.text3 }}>
                  Connect Stripe to start accepting payments from customers.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm" style={{ color: tokens.text2 }}>
              {['Card payments directly from your booking page', 'Funds deposited to your bank in 2 business days', 'Full payment history in your Stripe dashboard'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div style={{ width: 4, height: 4, borderRadius: 2, background: tokens.gold, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: tokens.gold, color: '#000', cursor: 'pointer', border: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                <path d="M13.5 11.5c0-1.4 1.1-2 2.9-2 2.6 0 5.8.8 8.4 2.2V5.5C22.2 4.2 19.3 3.5 16 3.5 9.5 3.5 5 7 5 13c0 9.3 12.8 7.8 12.8 11.8 0 1.7-1.4 2.2-3.4 2.2-2.9 0-6.6-1.2-9.5-2.8v6.3c3.2 1.4 6.5 2 9.5 2 6.7 0 11.4-3.3 11.4-9.4 0-10-12.8-8.2-12.8-11.6z"/>
              </svg>
              Connect with Stripe
            </button>
          </div>
        )}
      </div>

      {/* ── How it works ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <h3 className="text-sm font-semibold text-white mb-3">How payments work</h3>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Customer books and pays via your OpenBook page' },
            { step: '2', text: 'OpenBook collects 5% platform fee automatically' },
            { step: '3', text: 'Remaining 95% transferred to your bank account' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div
                style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: 'rgba(212,175,55,0.12)',
                  border:     '1px solid rgba(212,175,55,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: tokens.gold }}>{step}</span>
              </div>
              <p className="text-sm" style={{ color: tokens.text2 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusRow({
  label,
  ok,
  value,
  last = false,
}: {
  label: string
  ok?: boolean
  value: string
  last?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: last ? 'none' : `1px solid ${tokens.border}` }}
    >
      <span className="text-sm" style={{ color: tokens.text2 }}>{label}</span>
      <div className="flex items-center gap-1.5">
        {ok === true  && <CheckCircle size={12} color="#22c55e" />}
        {ok === false && <XCircle    size={12} color="#ef4444"  />}
        <span
          className="text-sm font-medium"
          style={{ color: ok === true ? '#22c55e' : ok === false ? '#ef4444' : tokens.text1 }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsContent />
    </Suspense>
  )
}
