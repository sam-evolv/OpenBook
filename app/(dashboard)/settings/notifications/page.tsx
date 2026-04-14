'use client'

import { useState } from 'react'

interface NotificationSetting {
  id: string
  label: string
  sub: string
  enabled: boolean
}

const DEFAULT_SETTINGS: NotificationSetting[] = [
  { id: '24h', label: '24h booking reminder', sub: 'Email + SMS sent 24 hours before each booking', enabled: true },
  { id: '2h', label: '2h booking reminder', sub: 'Email + SMS sent 2 hours before each booking', enabled: true },
  { id: 'new_booking', label: 'New booking email', sub: 'Email you when a customer books', enabled: true },
  { id: 'cancellation', label: 'Cancellation email', sub: 'Email you when a customer cancels', enabled: true },
  { id: 'waitlist', label: 'Waitlist notifications', sub: 'Notify customers when a slot opens up', enabled: true },
  { id: 'review', label: 'Review requests', sub: 'Send review request 24h after completed booking', enabled: false },
]

export default function NotificationsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  function toggle(id: string) {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-white">Notifications</h2>
        <p className="text-[13px] text-white/40 mt-0.5">Configure email and SMS reminders for you and your customers</p>
      </div>

      <div className="dashboard-card !p-0 overflow-hidden">
        <div className="divide-y divide-white/[0.06]">
          {settings.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-[14px] font-medium text-white">{item.label}</div>
                <div className="text-[12px] mt-0.5 text-white/40">{item.sub}</div>
              </div>
              <button
                onClick={() => toggle(item.id)}
                className="w-10 h-5 rounded-full transition-colors relative shrink-0"
                style={{ background: item.enabled ? '#D4AF37' : 'rgba(255,255,255,0.08)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: item.enabled ? '22px' : '2px' }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-white/30">
        Reminder cron runs every 30 minutes via Vercel cron. Configure{' '}
        <code className="text-[12px] text-[#D4AF37]">RESEND_API_KEY</code> and{' '}
        <code className="text-[12px] text-[#D4AF37]">TWILIO_*</code> env vars to enable delivery.
      </p>
    </div>
  )
}
