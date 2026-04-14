const META_API_BASE = 'https://graph.facebook.com/v19.0'

/**
 * Send a WhatsApp text message via Meta Cloud API.
 */
export async function sendWhatsAppMessage({
  phoneNumberId,
  to,
  message,
}: {
  phoneNumberId: string
  to: string
  message: string
}): Promise<void> {
  const res = await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/^whatsapp:/, ''),
      type: 'text',
      text: { body: message },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('WhatsApp send failed:', err)
  }
}
