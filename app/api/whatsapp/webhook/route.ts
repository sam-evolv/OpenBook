import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage } from '@/lib/whatsapp-brain'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' &&
      token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const message = value?.messages?.[0]

    if (!message || message.type !== 'text') {
      return new Response('OK', { status: 200 })
    }

    const customerPhone = message.from
    const messageText = message.text?.body
    const phoneNumberId = value.metadata?.phone_number_id

    if (!messageText || !phoneNumberId) {
      return new Response('OK', { status: 200 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find business by phone number ID, fall back to first live business for testing
    const { data: exactMatch } = await supabase
      .from('businesses')
      .select('*, services(*), business_hours(*)')
      .eq('whatsapp_phone_number_id', phoneNumberId)
      .eq('is_live', true)
      .single()

    let business = exactMatch

    if (!business) {
      const { data: fallbackBusiness } = await supabase
        .from('businesses')
        .select('*, services(*), business_hours(*)')
        .eq('is_live', true)
        .limit(1)
        .single()

      if (!fallbackBusiness) {
        return new Response('OK', { status: 200 })
      }

      business = fallbackBusiness
    }

    // Get or create conversation
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .upsert({
        business_id: business.id,
        customer_phone: customerPhone,
        last_message_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,customer_phone',
        ignoreDuplicates: false
      })
      .select()
      .single()

    // Save inbound message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation?.id,
      direction: 'inbound',
      body: messageText,
      meta_message_id: message.id
    })

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversation?.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Process with AI brain
    const reply = await processWhatsAppMessage({
      business,
      conversation: conversation || {
        state: 'idle', context: {}
      },
      messageText,
      recentMessages: recentMessages?.reverse() || []
    })

    // Send reply
    await sendWhatsAppMessage({
      phoneNumberId,
      to: customerPhone,
      message: reply
    })

    // Save outbound message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation?.id,
      direction: 'outbound',
      body: reply
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // Always return 200 to Meta to prevent retries
    return new Response('OK', { status: 200 })
  }
}
