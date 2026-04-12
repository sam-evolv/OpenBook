import { tokens } from '@/lib/types'

export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Notifications</h1>

      <div
        className="rounded-2xl divide-y"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}`, borderColor: tokens.border }}
      >
        {[
          { label: '24h booking reminder', sub: 'Email + SMS sent 24 hours before each booking', enabled: true },
          { label: '2h booking reminder', sub: 'Email + SMS sent 2 hours before each booking', enabled: true },
          { label: 'New booking email', sub: 'Email you when a customer books', enabled: true },
          { label: 'Cancellation email', sub: 'Email you when a customer cancels', enabled: true },
          { label: 'Waitlist notifications', sub: 'Notify customers when a slot opens up', enabled: true },
          { label: 'Review requests', sub: 'Send review request 24h after completed booking', enabled: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-xs mt-0.5" style={{ color: tokens.text2 }}>{item.sub}</div>
            </div>
            <div
              className="w-10 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer"
              style={{ background: item.enabled ? tokens.gold : tokens.surface2 }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ left: item.enabled ? '22px' : '2px' }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color: tokens.text3 }}>
        Reminder cron job runs every 30 minutes via Vercel cron. Configure{' '}
        <code className="text-xs" style={{ color: tokens.gold }}>RESEND_API_KEY</code> and{' '}
        <code className="text-xs" style={{ color: tokens.gold }}>TWILIO_*</code> env vars to enable delivery.
      </p>
    </div>
  )
}
