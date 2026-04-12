const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`

/**
 * Send a WhatsApp text message via Meta Cloud API.
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const res = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error: ${err}`)
  }
}

/**
 * Verify the X-Hub-Signature-256 header from Meta webhooks.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.META_WEBHOOK_VERIFY_TOKEN!
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody)
  )
  const expectedSig =
    'sha256=' +
    Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  return expectedSig === signature
}

export interface IncomingWhatsAppMessage {
  from: string
  text: string
  messageId: string
}

/**
 * Parse the raw Meta webhook payload into a simple message object.
 * Returns null if it's not a text message (e.g. status update).
 */
export function parseIncomingMessage(
  payload: Record<string, unknown>
): IncomingWhatsAppMessage | null {
  try {
    const entry = (payload.entry as Array<{ changes: Array<{ value: { messages?: Array<{ from: string; id: string; type: string; text?: { body: string } }> } }> }>)[0]
    const change = entry.changes[0]
    const message = change.value.messages?.[0]
    if (!message || message.type !== 'text' || !message.text) return null
    return {
      from: message.from,
      text: message.text.body,
      messageId: message.id,
    }
  } catch {
    return null
  }
}
