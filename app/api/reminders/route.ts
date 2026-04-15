import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendReminder } from '@/lib/reminders'
import { addHours } from 'date-fns'

// Vercel cron job: runs every 30 minutes.
// Sends 24h and 2h reminders for upcoming bookings.
// vercel.json: { "crons": [{ "path": "/api/reminders", "schedule": "0,30 * * * *" }] }
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const now = new Date()

  // 24h window: bookings starting between 23.5h and 24.5h from now
  const window24hStart = addHours(now, 23.5).toISOString()
  const window24hEnd = addHours(now, 24.5).toISOString()

  // 2h window: bookings starting between 1.5h and 2.5h from now
  const window2hStart = addHours(now, 1.5).toISOString()
  const window2hEnd = addHours(now, 2.5).toISOString()

  const { data: bookings24h } = await supabase
    .from('bookings')
    .select(`
      *,
      services:service_id ( name, duration_minutes ),
      businesses:business_id ( name, address ),
      customers:customer_id ( name, email, phone, expo_push_token )
    `)
    .eq('status', 'confirmed')
    .eq('reminder_24h_sent', false)
    .gte('starts_at', window24hStart)
    .lte('starts_at', window24hEnd)

  const { data: bookings2h } = await supabase
    .from('bookings')
    .select(`
      *,
      services:service_id ( name, duration_minutes ),
      businesses:business_id ( name, address ),
      customers:customer_id ( name, email, phone, expo_push_token )
    `)
    .eq('status', 'confirmed')
    .eq('reminder_2h_sent', false)
    .gte('starts_at', window2hStart)
    .lte('starts_at', window2hEnd)

  let sent = 0

  for (const booking of bookings24h ?? []) {
    try {
      await sendReminder({ booking: booking as Parameters<typeof sendReminder>[0]['booking'], type: '24h' })
      await supabase.from('bookings').update({ reminder_24h_sent: true }).eq('id', booking.id)
      sent++
    } catch { /* log in production */ }
  }

  for (const booking of bookings2h ?? []) {
    try {
      await sendReminder({ booking: booking as Parameters<typeof sendReminder>[0]['booking'], type: '2h' })
      await supabase.from('bookings').update({ reminder_2h_sent: true }).eq('id', booking.id)
      sent++
    } catch { /* log in production */ }
  }

  return NextResponse.json({ sent })
}
