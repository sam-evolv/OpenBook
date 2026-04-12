'use client'

import { useEffect, useState } from 'react'
import { tokens } from '@/lib/types'

interface ConnectStatus {
  connected: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  account_id?: string
}

export default function PaymentsPage() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetch('/api/stripe/connect')
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    setConnecting(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Payments</h1>

      <div
        className="rounded-2xl p-6"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        {loading ? (
          <div className="text-sm" style={{ color: tokens.text2 }}>Loading…</div>
        ) : status?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-white">Stripe account connected</span>
            </div>
            <div className="space-y-2">
              <Row label="Charges enabled" value={status.charges_enabled ? 'Yes' : 'No'} ok={status.charges_enabled} />
              <Row label="Payouts enabled" value={status.payouts_enabled ? 'Yes' : 'No'} ok={status.payouts_enabled} />
              <Row label="Account ID" value={status.account_id ?? '—'} />
            </div>
            <p className="text-xs" style={{ color: tokens.text3 }}>
              OpenBook charges a 5% platform fee on each transaction.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">Connect your bank account</h2>
              <p className="text-sm" style={{ color: tokens.text2 }}>
                Accept card payments directly. Powered by Stripe Connect — funds land in your bank account automatically.
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: tokens.gold, color: '#000' }}
            >
              {connecting ? 'Redirecting…' : 'Connect with Stripe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${tokens.border}` }}>
      <span className="text-sm" style={{ color: tokens.text2 }}>{label}</span>
      <span
        className="text-sm font-medium"
        style={{ color: ok === undefined ? tokens.text1 : ok ? '#22c55e' : '#ef4444' }}
      >
        {value}
      </span>
    </div>
  )
}
