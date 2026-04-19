export async function sendWhatsAppMessage({
  phoneNumberId,
  to,
  message
}: {
  phoneNumberId: string
  to: string
  message: string
}): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('whatsapp:', ''),
        type: 'text',
        text: { body: message }
      })
    }
  )
  if (!res.ok) {
    console.error('WhatsApp send failed:', await res.text())
  }
}
