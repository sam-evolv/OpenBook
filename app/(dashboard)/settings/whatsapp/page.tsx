'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tokens } from '@/lib/types'

export default function WhatsAppSettingsPage() {
  const [enabled, setEnabled] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, whatsapp_enabled, whatsapp_phone_number, whatsapp_display_name')
        .eq('owner_id', user.id)
        .single()
      if (!biz) return
      setBusinessId(biz.id)
      setBusinessName(biz.name)
      setEnabled(biz.whatsapp_enabled ?? false)
      setPhoneNumber(biz.whatsapp_phone_number ?? null)
      setDisplayName(biz.whatsapp_display_name ?? biz.name)
      setLoading(false)
    })
  }, [])

  async function handleToggle() {
    if (!businessId) return
    setSaving(true)
    const supabase = createClient()

    let assignedNumber = phoneNumber

    if (!enabled && !phoneNumber) {
      // Fetch an available number from the API
      const res = await fetch('/api/whatsapp/assign-number', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        assignedNumber = json.number ?? null
        setPhoneNumber(assignedNumber)
      }
    }

    const { error } = await supabase
      .from('businesses')
      .update({
        whatsapp_enabled: !enabled,
        whatsapp_phone_number: assignedNumber,
        whatsapp_display_name: displayName || businessName,
      })
      .eq('id', businessId)

    if (!error) {
      setEnabled(!enabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function saveDisplayName() {
    if (!businessId) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('businesses')
      .update({ whatsapp_display_name: displayName })
      .eq('id', businessId)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const waLink = phoneNumber ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}` : null

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-6 w-48 rounded-lg animate-pulse" style={{ background: tokens.surface2 }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-white">WhatsApp Booking Bot</h1>
        <p className="text-sm mt-1" style={{ color: tokens.text2 }}>
          Give your customers a 24/7 AI booking assistant on WhatsApp.
        </p>
      </div>

      {/* Enable toggle */}
      <div
        className="rounded-2xl p-6"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Enable WhatsApp booking</div>
            <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>
              {enabled ? 'Customers can book via WhatsApp' : 'Currently disabled'}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className="relative w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-50"
            style={{ background: enabled ? tokens.gold : tokens.surface2 }}
            aria-label="Toggle WhatsApp"
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ left: enabled ? '1.5rem' : '0.25rem' }}
            />
          </button>
        </div>

        {saved && (
          <p className="text-xs mt-3" style={{ color: '#22c55e' }}>Saved</p>
        )}
      </div>

      {/* Assigned number */}
      {enabled && phoneNumber && (
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
        >
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.text2 }}>
              Your WhatsApp booking number
            </label>
            <div
              className="rounded-xl px-4 py-3 text-sm font-mono text-white"
              style={{ background: tokens.surface2, border: `1px solid ${tokens.border}` }}
            >
              {phoneNumber}
            </div>
          </div>

          {/* QR / wa.me link */}
          {waLink && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.text2 }}>
                Customer link
              </label>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl px-4 py-3 text-sm transition-opacity hover:opacity-80"
                style={{
                  background: tokens.surface2,
                  border: `1px solid ${tokens.border}`,
                  color: tokens.gold,
                }}
              >
                {waLink}
              </a>
              <p className="text-xs mt-2" style={{ color: tokens.text3 }}>
                Share this link with customers. They tap it to open WhatsApp and start booking.
              </p>
            </div>
          )}

          {/* Display name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.text2 }}>
              Bot display name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none"
                style={{
                  background: tokens.surface2,
                  border: `1px solid ${tokens.border}`,
                }}
              />
              <button
                onClick={saveDisplayName}
                disabled={saving}
                className="px-4 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ background: tokens.gold, color: '#000' }}
              >
                Save
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: tokens.surface2 }}
          >
            <p className="text-sm font-semibold text-white">How it works</p>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: tokens.text2 }}>
              <li>Share the WhatsApp number above with your customers</li>
              <li>Customers message it to browse services and book</li>
              <li>The AI handles the full conversation 24/7</li>
              <li>Bookings appear in your Calendar automatically</li>
              <li>You can reply manually here at any time</li>
            </ol>
          </div>

          {/* Test button */}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: tokens.gold, color: '#000' }}
            >
              Send a test message
            </a>
          )}
        </div>
      )}

      {/* Sandbox note */}
      <div
        className="rounded-2xl p-5"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <p className="text-xs font-semibold text-white mb-1">Testing with Twilio Sandbox</p>
        <p className="text-xs" style={{ color: tokens.text2 }}>
          Before your number is approved by Meta, use the Twilio WhatsApp Sandbox.
          Send <span className="font-mono" style={{ color: tokens.gold }}>join [sandbox-word]</span> to{' '}
          <span className="font-mono" style={{ color: tokens.gold }}>+1 415 523 8886</span> to connect.
        </p>
      </div>
    </div>
  )
}
