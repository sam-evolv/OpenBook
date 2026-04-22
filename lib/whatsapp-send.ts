/**
 * Send a WhatsApp message via the Meta Graph API.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, error }` on failure.
 * The webhook brain ignores the return (fire-and-forget auto-reply);
 * dashboard server actions use it to stamp `status: 'failed'` on the
 * corresponding `whatsapp_messages` row so the UI can render a red tick.
 */
export type SendResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendWhatsAppMessage({
  phoneNumberId,
  to,
  message,
}: {
  phoneNumberId: string;
  to: string;
  message: string;
}): Promise<SendResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('whatsapp:', ''),
          type: 'text',
          text: { body: message },
        }),
      },
    );
    if (!res.ok) {
      const responseData = await res.json().catch(() => ({}));
      const code = responseData?.error?.code ?? 'unknown';
      const msg = responseData?.error?.message ?? 'send failed';
      console.error(`WA_SEND_FAIL code=${code} msg=${msg} pid=${phoneNumberId}`);
      return { ok: false, error: `${code}: ${msg}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`WA_SEND_THROW ${msg}`);
    return { ok: false, error: msg };
  }
}
