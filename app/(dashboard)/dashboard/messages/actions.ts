'use server';

import { revalidatePath } from 'next/cache';
import { requireCurrentBusiness } from '@/lib/queries/business';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { hasWhatsApp } from '@/lib/integrations';

interface BusinessRow {
  id: string;
  whatsapp_phone_number_id: string | null;
}

/**
 * Send a manual dashboard-initiated WhatsApp reply, then persist.
 *
 * Order matters:
 *  1. Call the send API first.
 *  2. Insert the outbound row with status reflecting that result.
 *
 * A failed send still gets persisted (status='failed') so the UI can
 * render it with a red tick — owners need to see what they tried to
 * send, not have it silently vanish. `source='manual'` so the Messages
 * UI doesn't render the "Auto" pill on human sends.
 *
 * The 24-hour WhatsApp "customer-initiated session" window is intentionally
 * not enforced yet — see Stage 1 polish note in docs/dashboard-v2-brief.md.
 */
export async function sendMessageAction(input: {
  conversationId: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = input.body.trim();
  if (!trimmed) return { ok: false, error: 'Message is empty' };
  if (trimmed.length > 4096) {
    return { ok: false, error: 'Message too long (max 4,096 characters)' };
  }

  const { sb, business } = await requireCurrentBusiness<BusinessRow>(
    'id, whatsapp_phone_number_id',
  );

  const { data: convRaw } = await sb
    .from('whatsapp_conversations')
    .select('id, business_id, customer_phone')
    .eq('id', input.conversationId)
    .maybeSingle();

  const conv = convRaw as
    | { id: string; business_id: string; customer_phone: string }
    | null;

  if (!conv || conv.business_id !== business.id) {
    return { ok: false, error: 'Conversation not found' };
  }

  let sendStatus: 'sent' | 'failed' = 'failed';
  let sendError: string | null = null;

  if (!hasWhatsApp()) {
    sendError = 'WhatsApp messaging is not enabled on this OpenBook deployment.';
  } else if (!business.whatsapp_phone_number_id) {
    sendError = 'WhatsApp number not configured for this business';
  } else {
    const result = await sendWhatsAppMessage({
      phoneNumberId: business.whatsapp_phone_number_id,
      to: conv.customer_phone,
      message: trimmed,
    });
    if (result.ok) {
      sendStatus = 'sent';
    } else {
      sendError = result.error;
    }
  }

  await sb.from('whatsapp_messages').insert({
    conversation_id: conv.id,
    direction: 'outbound',
    body: trimmed,
    source: 'manual',
    status: sendStatus,
  });

  await sb
    .from('whatsapp_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_read_at: new Date().toISOString(),
    })
    .eq('id', conv.id);

  revalidatePath('/dashboard/messages');

  if (sendStatus === 'failed') {
    return { ok: false, error: sendError ?? 'Send failed' };
  }
  return { ok: true };
}

/**
 * Mark a conversation as read. Idempotent — safe to call on every
 * thread selection, even if already read.
 */
export async function markConversationReadAction(
  conversationId: string,
): Promise<{ ok: boolean }> {
  const { sb, business } = await requireCurrentBusiness<BusinessRow>('id');

  const { data: conv } = await sb
    .from('whatsapp_conversations')
    .select('id, business_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!conv || (conv as { business_id: string }).business_id !== business.id) {
    return { ok: false };
  }

  await sb
    .from('whatsapp_conversations')
    .update({ last_read_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath('/dashboard/messages');
  return { ok: true };
}
