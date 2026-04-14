import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Assigns the next available number from WHATSAPP_NUMBER_POOL to the
 * authenticated owner's business. Returns the assigned number.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pool = (process.env.WHATSAPP_NUMBER_POOL ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)

  if (!pool.length) {
    return NextResponse.json({ error: 'No numbers in pool' }, { status: 503 })
  }

  // Find already-assigned numbers
  const { data: assigned } = await supabase
    .from('businesses')
    .select('whatsapp_phone_number')
    .not('whatsapp_phone_number', 'is', null)

  const taken = new Set((assigned ?? []).map((b) => b.whatsapp_phone_number))
  const available = pool.find((n) => !taken.has(n))

  if (!available) {
    return NextResponse.json({ error: 'No numbers available in pool' }, { status: 503 })
  }

  return NextResponse.json({ number: available })
}
