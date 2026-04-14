import { createClient } from '@/lib/supabase/server'
import { BookingsClient } from '@/components/dashboard/BookingsClient'

export const dynamic = 'force-dynamic'

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
      customers:customer_id ( name, email, phone )
    `)
    .eq('business_id', business!.id)
    .order('starts_at', { ascending: false })
    .limit(100)

  const serialized = (bookings ?? []).map((b) => ({
    id: b.id,
    starts_at: b.starts_at,
    status: b.status as string,
    price_cents: b.price_cents,
    source: (b.source ?? 'app') as string,
    service: b.services as { name: string; colour: string } | null,
    customer: b.customers as { name: string; email: string; phone: string | null } | null,
  }))

  return <BookingsClient bookings={serialized} />
}
