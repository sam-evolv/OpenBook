'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { Thread } from './Thread';
import { ContextPane } from './ContextPane';
import { EmptyState } from '../EmptyState';
import {
  markConversationReadAction,
} from '@/app/(dashboard)/dashboard/messages/actions';
import type {
  InboxPayload,
  InboxConversation,
  ThreadMessage,
  CustomerContext,
} from '@/lib/dashboard-v2/messages-queries';

interface MessagesClientProps {
  inbox: InboxPayload;
  thread: {
    messages: ThreadMessage[];
    conversation: {
      id: string;
      customer_phone: string;
      customer_name: string | null;
      last_message_at: string | null;
      last_read_at: string | null;
      state: string | null;
    };
    customerContext: CustomerContext | null;
  } | null;
  selectedId: string | null;
  tab: 'whatsapp' | 'ai';
  businessSlug: string;
}

const POLL_INTERVAL_MS = 5_000;

/**
 * 3-pane Messages shell.
 *
 * - Polls the server via router.refresh() every 5s so inbound WhatsApp
 *   messages land without manual refresh. Paused when the tab is
 *   hidden (document.visibilityState) to avoid burning compute while
 *   the owner is elsewhere.
 * - Marks the active conversation read on selection (fire-and-forget
 *   server action); the unread badge in the Sidebar updates on the
 *   next refresh.
 */
export function MessagesClient({
  inbox,
  thread,
  selectedId,
  tab,
}: MessagesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [, startTransition] = useTransition();
  const lastMarkedRef = useRef<string | null>(null);

  const updateUrl = useCallback(
    (updates: { conversation?: string | null; tab?: 'whatsapp' | 'ai' }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.conversation !== undefined) {
        if (updates.conversation) params.set('conversation', updates.conversation);
        else params.delete('conversation');
      }
      if (updates.tab) {
        if (updates.tab === 'ai') params.set('tab', 'ai');
        else params.delete('tab');
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const onSelect = useCallback(
    (id: string) => {
      updateUrl({ conversation: id });
    },
    [updateUrl],
  );

  const onTabChange = useCallback(
    (nextTab: 'whatsapp' | 'ai') => {
      updateUrl({ tab: nextTab });
    },
    [updateUrl],
  );

  // Poll-refresh every 5s; pause on hidden tab.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function tick() {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }

    function start() {
      if (timer) return;
      timer = setInterval(tick, POLL_INTERVAL_MS);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        router.refresh();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  // Mark read on conversation change when the active thread is unread.
  useEffect(() => {
    if (!selectedId) return;
    if (lastMarkedRef.current === selectedId) return;

    const active = inbox.conversations.find((c) => c.id === selectedId);
    if (active?.unread) {
      lastMarkedRef.current = selectedId;
      void markConversationReadAction(selectedId);
    } else {
      lastMarkedRef.current = selectedId;
    }
  }, [selectedId, inbox.conversations]);

  const activeConversation: InboxConversation | null = useMemo(() => {
    if (!selectedId) return null;
    return inbox.conversations.find((c) => c.id === selectedId) ?? null;
  }, [inbox.conversations, selectedId]);

  return (
    <div className="flex h-[100dvh]">
      <ConversationList
        tab={tab}
        conversations={inbox.conversations}
        aiQueries={inbox.aiQueries}
        selectedId={selectedId}
        search={search}
        onSearchChange={setSearch}
        onTabChange={onTabChange}
        onSelect={onSelect}
        unreadCount={inbox.unreadCount}
      />

      {activeConversation && thread ? (
        <>
          <Thread conversation={activeConversation} messages={thread.messages} />
          <ContextPane
            conversation={activeConversation}
            customer={thread.customerContext}
          />
        </>
      ) : (
        <section className="flex flex-1 items-center justify-center px-8 py-10">
          <div className="max-w-md">
            <EmptyState
              icon={MessageCircle}
              title={
                tab === 'ai'
                  ? 'AI queries inbox'
                  : inbox.conversations.length === 0
                    ? 'No conversations yet'
                    : 'Pick a conversation'
              }
              description={
                tab === 'ai'
                  ? 'ChatGPT, Claude, and Gemini bookings appear here once your business is live on mcp.openbook.ie.'
                  : inbox.conversations.length === 0
                    ? 'WhatsApp threads appear here once a customer messages your business number. Nothing to do until then.'
                    : 'Choose someone on the left to open the thread.'
              }
            />
          </div>
        </section>
      )}
    </div>
  );
}
