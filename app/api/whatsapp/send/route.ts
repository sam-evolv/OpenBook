import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, message }: { to: string; message: string } = await req.json()
  if (!to || !message) {
    return NextResponse.json({ error: 'to and message required' }, { status: 400 })
  }

  await sendWhatsAppMessage(to, message)
  return NextResponse.json({ sent: true })
}
