import { createClient } from '@/lib/supabase/server'
import { CustomersClient } from '@/components/dashboard/CustomersClient'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('customer_id, price_cents, status, starts_at, customers:customer_id(id, name, email, phone, created_at)')
    .eq('business_id', business!.id)
    .neq('status', 'cancelled')

  // Aggregate by customer
  const customerMap = new Map<string, {
    id: string; name: string; email: string; phone: string | null
    bookingCount: number; totalSpend: number; firstSeen: string; lastVisit: string
  }>()

  for (const b of bookings ?? []) {
    const c = b.customers as { id: string; name: string; email: string; phone: string | null; created_at: string } | null
    if (!c) continue
    const existing = customerMap.get(c.id) ?? {
      id: c.id, name: c.name ?? '—', email: c.email ?? '—', phone: c.phone,
      bookingCount: 0, totalSpend: 0, firstSeen: c.created_at ?? '', lastVisit: '',
    }
    customerMap.set(c.id, {
      ...existing,
      bookingCount: existing.bookingCount + 1,
      totalSpend: existing.totalSpend + b.price_cents,
      lastVisit: b.starts_at > existing.lastVisit ? b.starts_at : existing.lastVisit,
    })
  }

  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpend - a.totalSpend)

  return <CustomersClient customers={customers} />
}
