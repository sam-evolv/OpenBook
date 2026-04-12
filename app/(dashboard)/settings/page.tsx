'use client'

import { useState } from 'react'
import { Pencil, Copy, ExternalLink, Zap } from 'lucide-react'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  description: string
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150">
      <div>
        <p className="text-[13px] font-medium text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 shrink-0 ${
          checked ? 'bg-brand-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-premium ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function SettingRow({
  label,
  value,
  onEdit,
  onCopy,
}: {
  label: string
  value: string
  onEdit?: () => void
  onCopy?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
        <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onCopy && (
          <button
            onClick={onCopy}
            className="flex items-center justify-center w-7 h-7 rounded-card text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Copy"
          >
            <Copy size={13} />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center justify-center w-7 h-7 rounded-card text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Edit"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [emailBooking, setEmailBooking] = useState(true)
  const [smsReminders, setSmsReminders] = useState(true)
  const [waitlistNotify, setWaitlistNotify] = useState(false)

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      {/* Business */}
      <Section title="Business">
        <SettingRow
          label="Business name"
          value="Evolv Performance"
          onEdit={() => {}}
        />
        <SettingRow
          label="Booking URL"
          value="openbook.ai/evolv-performance"
          onEdit={() => {}}
          onCopy={() => navigator.clipboard.writeText('https://openbook.ai/evolv-performance')}
        />
        <SettingRow
          label="Timezone"
          value="Europe/Dublin (GMT+1)"
          onEdit={() => {}}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Toggle
          checked={emailBooking}
          onChange={setEmailBooking}
          label="Email on new booking"
          description="Receive an email when a new booking is created"
        />
        <Toggle
          checked={smsReminders}
          onChange={setSmsReminders}
          label="SMS reminders"
          description="Send clients an SMS reminder 24h before their appointment"
        />
        <Toggle
          checked={waitlistNotify}
          onChange={setWaitlistNotify}
          label="Waitlist auto-notify"
          description="Automatically message waitlisted clients when a slot opens"
        />
      </Section>

      {/* Plan */}
      <Section title="Plan">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-premium bg-brand-500/15">
              <Zap size={14} className="text-brand-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Pro Plan</p>
              <p className="text-[11px] text-gray-400">Unlimited bookings · 5 staff · Analytics</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-premium border border-brand-500 text-[12px] font-semibold text-brand-500 hover:bg-brand-500/5 transition-all duration-150 ease-premium focus-visible:ring-2 focus-visible:ring-brand-500">
            <ExternalLink size={12} />
            Upgrade
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
        {title}
      </h2>
      <div className="bg-white rounded-premium border border-gray-100 shadow-card divide-y divide-gray-50 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
