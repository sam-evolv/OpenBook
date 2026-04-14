import { createClient } from '@/lib/supabase/server'
import { startOfWeek, endOfWeek } from 'date-fns'
import { CalendarClient } from '@/components/dashboard/CalendarClient'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, primary_colour')
    .eq('owner_id', user!.id)
    .single()

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, starts_at, ends_at, status,
      services:service_id(name, colour, duration_minutes),
      customers:customer_id(name)
    `)
    .eq('business_id', business!.id)
    .gte('starts_at', weekStart.toISOString())
    .lte('starts_at', weekEnd.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at')

  const serialized = (bookings ?? []).map((b) => ({
    id: b.id,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status as string,
    service: b.services as { name: string; colour: string; duration_minutes: number } | null,
    customer: b.customers as { name: string } | null,
  }))

  return (
    <CalendarClient
      bookings={serialized}
      primaryColour={business?.primary_colour ?? '#D4AF37'}
    />
  )
}
