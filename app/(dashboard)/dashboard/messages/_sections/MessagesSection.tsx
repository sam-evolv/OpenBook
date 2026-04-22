import { createSupabaseServerClient } from '@/lib/supabase-server';
import { loadInbox, loadThread } from '@/lib/dashboard-v2/messages-queries';
import { MessagesClient } from '@/components/dashboard-v2/messages/MessagesClient';

interface MessagesSectionProps {
  businessId: string;
  businessSlug: string;
  activeConversationId: string | null;
  tab: 'whatsapp' | 'ai';
}

export async function MessagesSection({
  businessId,
  businessSlug,
  activeConversationId,
  tab,
}: MessagesSectionProps) {
  const sb = createSupabaseServerClient();
  const inbox = await loadInbox(sb, businessId);

  // If the URL didn't specify a conversation, default to the first one
  // in the inbox so the owner always lands on something to read. Null
  // only when the inbox is empty.
  const selectedId =
    activeConversationId && inbox.conversations.some((c) => c.id === activeConversationId)
      ? activeConversationId
      : inbox.conversations[0]?.id ?? null;

  const thread = selectedId ? await loadThread(sb, businessId, selectedId) : null;

  return (
    <MessagesClient
      inbox={inbox}
      thread={thread}
      selectedId={selectedId}
      tab={tab}
      businessSlug={businessSlug}
    />
  );
}
