import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user!.id)
    .single()

  if (!business) return null

  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://openbook.ai'}/${business.slug}`

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/settings/hours', label: 'Opening hours', desc: 'Set your weekly schedule' },
          { href: '/settings/payments', label: 'Payments', desc: 'Connect Stripe to accept cards' },
          { href: '/settings/notifications', label: 'Notifications', desc: 'Reminders & alerts' },
          { href: '/settings/whatsapp', label: 'WhatsApp bot', desc: 'Enable AI booking via WhatsApp' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl p-5 hover:bg-white/[0.04] transition-colors"
            style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
          >
            <div className="text-sm font-semibold text-white">{item.label}</div>
            <div className="text-xs mt-1" style={{ color: tokens.text2 }}>{item.desc}</div>
          </Link>
        ))}
      </div>

      {/* Business info */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <h2 className="text-base font-semibold text-white">Business info</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business name" value={business.name} />
          <Field label="Category" value={business.category} />
          <Field label="City" value={business.city ?? '—'} />
          <Field label="Address" value={business.address ?? '—'} />
          <Field label="Website" value={business.website ?? '—'} />
          <Field label="Instagram" value={business.instagram_handle ? `@${business.instagram_handle}` : '—'} />
          <Field label="WhatsApp bot number" value={business.whatsapp_number ?? 'Not connected'} />
          <Field label="Buffer between bookings" value={`${business.buffer_minutes ?? 15} min`} />
        </div>

        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: tokens.surface2 }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: tokens.text2 }}>Your booking URL</div>
            <div className="text-sm font-medium mt-0.5" style={{ color: tokens.gold }}>
              {bookingUrl}
            </div>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: business.is_live ? '#22c55e' : '#ef4444' }}
            title={business.is_live ? 'Live' : 'Not live'}
          />
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: tokens.text2 }}>
        {label}
      </label>
      <div
        className="rounded-xl px-4 py-3 text-sm text-white"
        style={{ background: tokens.surface2, border: `1px solid ${tokens.border}` }}
      >
        {value}
      </div>
    </div>
  )
}
