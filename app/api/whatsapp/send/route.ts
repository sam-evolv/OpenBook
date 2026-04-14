import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, to, body }: { conversationId: string; to: string; body: string } =
    await req.json()
  if (!conversationId || !to || !body) {
    return NextResponse.json({ error: 'conversationId, to, and body required' }, { status: 400 })
  }

  // Verify conversation belongs to this owner's business
  const { data: convo } = await supabase
    .from('whatsapp_conversations')
    .select('id, business_id, businesses:business_id(owner_id)')
    .eq('id', conversationId)
    .single()

  const biz = convo?.businesses as { owner_id: string } | null
  if (!convo || biz?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
  if (!phoneNumberId) {
    return NextResponse.json({ error: 'WHATSAPP_PHONE_NUMBER_ID not configured' }, { status: 503 })
  }

  await sendWhatsAppMessage({ phoneNumberId, to, message: body })

  // Persist outbound message
  const serviceSupabase = await createServiceClient()
  await serviceSupabase.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    body,
    status: 'sent',
  })

  return NextResponse.json({ sent: true })
}
