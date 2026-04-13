import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')

  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flash_sales')
    .select(`
      id,
      sale_price_cents,
      original_price_cents,
      discount_percent,
      slot_time,
      expires_at,
      max_bookings,
      bookings_taken,
      message,
      services:service_id ( id, name, duration_minutes, colour )
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[flash-sales/active]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
