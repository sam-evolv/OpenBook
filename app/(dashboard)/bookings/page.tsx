import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const STATUS_COLOURS: Record<string, string> = {
  confirmed: '#22c55e',
  completed: tokens.gold,
  cancelled: '#ef4444',
  no_show: '#f97316',
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, status, price_cents, source,
      services:service_id ( name, colour ),
      customers:customer_id ( name, email )
    `)
    .eq('business_id', business!.id)
    .order('starts_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Bookings</h1>
        <span className="text-sm" style={{ color: tokens.text2 }}>
          {bookings?.length ?? 0} shown
        </span>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div
          className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide"
          style={{ color: tokens.text3, borderBottom: `1px solid ${tokens.border}` }}
        >
          <span>Customer</span>
          <span>Service</span>
          <span>Date & Time</span>
          <span>Amount</span>
          <span>Status</span>
        </div>

        <div className="divide-y" style={{ borderColor: tokens.border }}>
          {(bookings ?? []).length === 0 && (
            <p className="py-12 text-center text-sm" style={{ color: tokens.text3 }}>
              No bookings yet
            </p>
          )}
          {(bookings ?? []).map((b) => {
            const service = b.services as { name: string; colour: string } | null
            const customer = b.customers as { name: string; email: string } | null
            const statusColour = STATUS_COLOURS[b.status ?? 'confirmed'] ?? tokens.text2
            return (
              <div
                key={b.id}
                className="flex md:grid md:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-white">{customer?.name ?? '—'}</div>
                  <div className="text-xs mt-0.5" style={{ color: tokens.text3 }}>
                    {customer?.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: service?.colour ?? tokens.gold }}
                  />
                  <span className="text-sm text-white">{service?.name}</span>
                </div>
                <div className="text-right md:text-left">
                  <div className="text-sm text-white">
                    {format(new Date(b.starts_at), 'dd MMM yyyy')}
                  </div>
                  <div className="text-xs" style={{ color: tokens.text3 }}>
                    {format(new Date(b.starts_at), 'HH:mm')}
                  </div>
                </div>
                <span className="text-sm font-semibold text-white hidden md:block">
                  {formatPrice(b.price_cents)}
                </span>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap"
                  style={{
                    background: `${statusColour}15`,
                    color: statusColour,
                  }}
                >
                  {b.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
