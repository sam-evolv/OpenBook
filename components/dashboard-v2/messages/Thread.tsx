'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../Button';
import { AISuggestionChips } from './AISuggestionChips';
import type { ThreadMessage, InboxConversation } from '@/lib/dashboard-v2/messages-queries';
import { formatPhoneForDisplay } from '@/lib/dashboard-v2/customer';
import { sendMessageAction } from '@/app/(dashboard)/dashboard/messages/actions';

interface ThreadProps {
  conversation: InboxConversation;
  messages: ThreadMessage[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export function Thread({ conversation, messages }: ThreadProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSend] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1]! : null;
  const lastInbound = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.direction === 'inbound') return messages[i]!;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, conversation.id]);

  useEffect(() => {
    setDraft('');
    setError(null);
  }, [conversation.id]);

  function onPickSuggestion(text: string) {
    setDraft(text);
    // Focus + caret-to-end so the owner can immediately edit/append.
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      const end = text.length;
      ta.setSelectionRange(end, end);
    }
  }

  const grouped = groupByDay(messages);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;
    setError(null);
    startSend(async () => {
      const res = await sendMessageAction({
        conversationId: conversation.id,
        body,
      });
      if (res.ok) {
        setDraft('');
      } else {
        setError(res.error);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <section className="flex flex-1 flex-col min-w-0 bg-paper-bg dark:bg-ink-bg">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-paper-border dark:border-ink-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-paper-surface2 to-paper-borderStrong dark:from-ink-surface2 dark:to-ink-borderStrong text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1">
          {conversation.display_name.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 truncate">
            {conversation.display_name}
          </div>
          <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 font-mono">
            {formatPhoneForDisplay(conversation.customer_phone)}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {grouped.map((group) => (
          <div key={group.day} className="mb-5 last:mb-0">
            <div className="flex items-center justify-center mb-3">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3 bg-paper-surface dark:bg-ink-surface border border-paper-border dark:border-ink-border rounded-full px-2.5 py-0.5">
                {formatDateLabel(group.day)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {group.messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </ul>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="px-6 py-4 border-t border-paper-border dark:border-ink-border bg-paper-bg dark:bg-ink-bg"
      >
        {error && (
          <div className="flex items-center gap-2 mb-2.5 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-[12px] text-red-600 dark:text-red-400">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}
        <AISuggestionChips
          conversationId={conversation.id}
          lastInboundId={lastInbound?.id ?? null}
          lastInboundAt={lastInbound?.created_at ?? null}
          lastMessageDirection={lastMessage?.direction ?? null}
          isComposing={draft.trim().length > 0}
          onPick={onPickSuggestion}
        />
        <div className="flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Reply to this customer…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3.5 py-2.5 text-[13.5px] text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={<Send size={13} />}
            disabled={isSending || draft.trim().length === 0}
          >
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-paper-text-3 dark:text-ink-text-3 hidden md:block">
          Press <kbd className="font-mono">⌘↵</kbd> to send
        </p>
      </form>
    </section>
  );
}

function MessageBubble({ message }: { message: ThreadMessage }) {
  const isOutbound = message.direction === 'outbound';
  const failed = message.status === 'failed';
  const isAuto = message.source === 'bot';

  return (
    <li className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[70%] flex flex-col', isOutbound ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-3.5 py-2 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap break-words',
            isOutbound
              ? failed
                ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 rounded-br-md'
                : 'bg-gold/90 text-black rounded-br-md'
              : 'bg-paper-surface dark:bg-ink-surface border border-paper-border dark:border-ink-border text-paper-text-1 dark:text-ink-text-1 rounded-bl-md',
          )}
        >
          {message.body}
        </div>
        <div className="flex items-center gap-1.5 mt-1 px-1">
          {isOutbound && isAuto && (
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.35px] text-gold bg-gold-soft border border-gold-border rounded-[3px] px-1.5 py-[1px]">
              Auto
            </span>
          )}
          <span className="text-[10.5px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
            {formatTime(message.created_at)}
          </span>
          {isOutbound && failed && (
            <span className="inline-flex items-center gap-0.5 text-[10.5px] text-red-600 dark:text-red-400">
              <AlertCircle size={10} /> not delivered
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function groupByDay(messages: ThreadMessage[]): Array<{ day: string; messages: ThreadMessage[] }> {
  const groups = new Map<string, ThreadMessage[]>();
  for (const m of messages) {
    const day = m.created_at.slice(0, 10);
    const existing = groups.get(day) ?? [];
    existing.push(m);
    groups.set(day, existing);
  }
  return Array.from(groups.entries()).map(([day, messages]) => ({ day, messages }));
}
