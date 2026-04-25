import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage } from '@/lib/whatsapp-brain'
import { sendWhatsAppMessage } from '@/lib/whatsapp-send'
import { hasOpenAI, hasWhatsApp } from '@/lib/integrations'

/**
 * GET: Meta's subscription verification dance — echo the challenge
 * back if the verify token matches. When the WhatsApp integration
 * isn't configured at all, treat unsigned requests as 404 so the
 * route doesn't accidentally accept arbitrary callers.
 */
export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (!verifyToken) {
    return new Response('Not configured', { status: 404 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  return new Response('Forbidden', { status: 403 })
}

/**
 * Verify the x-hub-signature-256 header against an HMAC-SHA256 of the
 * raw request body using WHATSAPP_APP_SECRET. Returns true only if the
 * signature is present and matches. Fails closed — missing secret env
 * or missing header both return false.
 *
 * Constant-time comparison via crypto.timingSafeEqual, which throws on
 * length mismatch so we guard that ourselves.
 *
 * Meta signs as `sha256=<hex>`. Ref:
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#event-notifications
 */
function verifyMetaSignature(rawBody: string, headerValue: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    console.error('WA_WEBHOOK_MISSING_APP_SECRET')
    return false
  }
  if (!headerValue || !headerValue.startsWith('sha256=')) {
    return false
  }
  const provided = headerValue.slice('sha256='.length)
  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')

  if (provided.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // If WhatsApp isn't configured on this deploy, refuse the call. The
  // webhook should only be reachable for production businesses with
  // Meta credentials wired up.
  if (!hasWhatsApp()) {
    return new Response('Not configured', { status: 404 })
  }

  // Read the raw body text first — we need it verbatim for HMAC.
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(rawBody, signatureHeader)) {
    // 403 rather than 200: signals upstream proxies and dashboards
    // that this request was rejected. Meta won't retry on 4xx.
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const body = JSON.parse(rawBody)
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

    // Resolve the business by phone_number_id — exact match only.
    // The previous "fall back to first live business" path is gone:
    // a second onboarded business would have misrouted any no-match
    // inbound to the first row in the DB, corrupting the wrong
    // customer's inbox. On no match we log and 200 — Meta won't
    // retry and no state is touched.
    const { data: business } = await supabase
      .from('businesses')
      .select('*, services(*), business_hours(*)')
      .eq('whatsapp_phone_number_id', phoneNumberId)
      .eq('is_live', true)
      .single()

    if (!business) {
      console.error(`WA_WEBHOOK_NO_BUSINESS phone_number_id=${phoneNumberId}`)
      return new Response('OK', { status: 200 })
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

    // Process with AI brain — only if OpenAI is configured. Otherwise
    // log the inbound (already saved above) and skip the auto-reply so
    // the conversation still appears in the dashboard inbox for the
    // owner to handle manually.
    if (!hasOpenAI()) {
      console.info(
        `WA_WEBHOOK_INBOUND_LOGGED conversation=${conversation?.id} — auto-reply skipped (OPENAI_API_KEY not configured)`,
      )
      return new Response('OK', { status: 200 })
    }

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

    // Save outbound message. `source: 'bot'` marks this as an auto-reply
    // from the webhook brain so the dashboard Messages view can render
    // the "Auto" pill. Manual sends from the dashboard stamp 'manual'.
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation?.id,
      direction: 'outbound',
      body: reply,
      source: 'bot'
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // Always return 200 to Meta to prevent retries on our parse/DB bugs.
    // Note: we only reach here after signature verification has passed,
    // so this doesn't mask rejected traffic.
    return new Response('OK', { status: 200 })
  }
}
