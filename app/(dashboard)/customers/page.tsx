import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/types'
import { formatPrice, getInitials } from '@/lib/utils'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  // Get customers who have bookings with this business
  const { data: bookings } = await supabase
    .from('bookings')
    .select('customer_id, price_cents, status, customers:customer_id(id, name, email, phone, created_at)')
    .eq('business_id', business!.id)
    .neq('status', 'cancelled')

  // Aggregate by customer
  const customerMap = new Map<string, {
    id: string; name: string; email: string; phone: string | null
    bookingCount: number; totalSpend: number; firstSeen: string
  }>()

  for (const b of bookings ?? []) {
    const c = b.customers as { id: string; name: string; email: string; phone: string | null; created_at: string } | null
    if (!c) continue
    const existing = customerMap.get(c.id) ?? {
      id: c.id, name: c.name ?? '—', email: c.email ?? '—', phone: c.phone,
      bookingCount: 0, totalSpend: 0, firstSeen: c.created_at ?? '',
    }
    customerMap.set(c.id, {
      ...existing,
      bookingCount: existing.bookingCount + 1,
      totalSpend: existing.totalSpend + b.price_cents,
    })
  }

  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpend - a.totalSpend)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Customers</h1>
        <span className="text-sm" style={{ color: tokens.text2 }}>
          {customers.length} clients
        </span>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.surface1, border: `1px solid ${tokens.border}` }}
      >
        <div
          className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wide"
          style={{ color: tokens.text3, borderBottom: `1px solid ${tokens.border}` }}
        >
          <span>Client</span>
          <span>Bookings</span>
          <span>Total spend</span>
          <span>Member since</span>
        </div>

        <div className="divide-y" style={{ borderColor: tokens.border }}>
          {customers.length === 0 && (
            <p className="py-12 text-center text-sm" style={{ color: tokens.text3 }}>
              No customers yet
            </p>
          )}
          {customers.map((c) => (
            <div
              key={c.id}
              className="flex md:grid md:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${tokens.gold}20`, color: tokens.gold }}
                >
                  {getInitials(c.name ?? 'A')}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{c.name}</div>
                  <div className="text-xs truncate" style={{ color: tokens.text3 }}>{c.email}</div>
                </div>
              </div>
              <span className="text-sm text-white text-center">{c.bookingCount}</span>
              <span className="text-sm font-semibold text-white">{formatPrice(c.totalSpend)}</span>
              <span className="text-xs hidden md:block" style={{ color: tokens.text3 }}>
                {c.firstSeen ? format(new Date(c.firstSeen), 'dd MMM yyyy') : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
