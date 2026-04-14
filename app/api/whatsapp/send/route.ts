import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import twilio from 'twilio'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, to, body }: { conversationId: string; to: string; body: string } =
    await req.json()
  if (!conversationId || !to || !body) {
    return NextResponse.json({ error: 'conversationId, to, and body required' }, { status: 400 })
  }

  // Verify the conversation belongs to this owner's business
  const { data: convo } = await supabase
    .from('whatsapp_conversations')
    .select('id, business_id, businesses:business_id(whatsapp_phone_number, owner_id)')
    .eq('id', conversationId)
    .single()

  const biz = convo?.businesses as { whatsapp_phone_number: string | null; owner_id: string } | null
  if (!convo || biz?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const fromNumber = biz?.whatsapp_phone_number ?? process.env.TWILIO_WHATSAPP_FROM ?? ''

  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const fromWa = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`

  let sid: string | null = null
  try {
    const msg = await client.messages.create({ from: fromWa, to: toWa, body })
    sid = msg.sid
  } catch (err) {
    console.error('Twilio send error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  // Save the outbound message
  const serviceSupabase = await createServiceClient()
  await serviceSupabase.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    body,
    twilio_sid: sid ?? undefined,
    status: 'sent',
  })

  return NextResponse.json({ sent: true, sid })
}
