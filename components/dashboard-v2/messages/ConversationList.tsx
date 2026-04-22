'use client';

import { Bot, Search, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxConversation, AIQueryRow } from '@/lib/dashboard-v2/messages-queries';
import { formatPhoneForDisplay } from '@/lib/dashboard-v2/customer';

interface ConversationListProps {
  tab: 'whatsapp' | 'ai';
  conversations: InboxConversation[];
  aiQueries: AIQueryRow[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: 'whatsapp' | 'ai') => void;
  onSelect: (conversationId: string) => void;
  unreadCount: number;
}

function timeAgoShort(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export function ConversationList({
  tab,
  conversations,
  aiQueries,
  selectedId,
  search,
  onSearchChange,
  onTabChange,
  onSelect,
  unreadCount,
}: ConversationListProps) {
  const filtered =
    tab === 'whatsapp'
      ? conversations.filter((c) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            c.display_name.toLowerCase().includes(q) ||
            c.customer_phone.includes(q) ||
            c.last_preview.toLowerCase().includes(q)
          );
        })
      : [];

  return (
    <aside className="flex h-full w-[320px] flex-col border-r border-paper-border dark:border-ink-border bg-paper-bg dark:bg-ink-bg">
      <div className="px-4 pt-5 pb-3 border-b border-paper-border dark:border-ink-border">
        <h1 className="text-[17px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 mb-3">
          Messages
        </h1>

        <div className="flex items-center gap-0.5 p-0.5 mb-3 rounded-lg bg-paper-surface dark:bg-ink-surface border border-paper-border dark:border-ink-border">
          <TabButton
            active={tab === 'whatsapp'}
            onClick={() => onTabChange('whatsapp')}
            label="WhatsApp"
            count={unreadCount > 0 ? unreadCount : undefined}
          />
          <TabButton
            active={tab === 'ai'}
            onClick={() => onTabChange('ai')}
            label="ChatGPT queries"
            count={aiQueries.length > 0 ? aiQueries.length : undefined}
          />
        </div>

        {tab === 'whatsapp' && (
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-paper-text-3 dark:text-ink-text-3"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, phone, text…"
              className="w-full h-8 pl-7 pr-2.5 text-[12.5px] rounded-md border border-paper-border dark:border-ink-border bg-paper-bg dark:bg-ink-bg text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'whatsapp' ? (
          filtered.length === 0 ? (
            <EmptyInboxState hasSearch={search.length > 0} />
          ) : (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                onClick={() => onSelect(c.id)}
              />
            ))
          )
        ) : (
          <AIQueriesList queries={aiQueries} />
        )}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[12px] font-medium transition-colors',
        active
          ? 'bg-paper-bg dark:bg-ink-bg text-paper-text-1 dark:text-ink-text-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
          : 'text-paper-text-2 dark:text-ink-text-2 hover:text-paper-text-1 dark:hover:text-ink-text-1',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold rounded-[3px] tabular-nums',
            active
              ? 'bg-gold text-black'
              : 'bg-paper-surface2 dark:bg-ink-surface2 text-paper-text-2 dark:text-ink-text-2',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: InboxConversation;
  active: boolean;
  onClick: () => void;
}) {
  const initial = conversation.display_name.trim().charAt(0).toUpperCase() || '?';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 flex items-start gap-3 border-b border-paper-border dark:border-ink-border text-left transition-colors',
        active
          ? 'bg-paper-surface dark:bg-ink-surface'
          : 'hover:bg-paper-surface/60 dark:hover:bg-ink-surface/60',
      )}
    >
      <div className="relative shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-paper-surface2 to-paper-borderStrong dark:from-ink-surface2 dark:to-ink-borderStrong text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1">
          {initial}
        </div>
        {conversation.unread && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-paper-bg dark:ring-ink-bg" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'text-[13.5px] truncate',
              conversation.unread
                ? 'font-semibold text-paper-text-1 dark:text-ink-text-1'
                : 'font-medium text-paper-text-1 dark:text-ink-text-1',
            )}
          >
            {conversation.display_name}
          </span>
          <span className="text-[10.5px] tabular-nums text-paper-text-3 dark:text-ink-text-3 shrink-0">
            {timeAgoShort(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {conversation.last_direction === 'outbound' && (
            <span className="text-[11px] text-paper-text-3 dark:text-ink-text-3 shrink-0">
              {conversation.last_source === 'bot' ? 'Auto ·' : 'You ·'}
            </span>
          )}
          <span
            className={cn(
              'text-[12px] truncate',
              conversation.unread
                ? 'text-paper-text-1 dark:text-ink-text-1'
                : 'text-paper-text-2 dark:text-ink-text-2',
            )}
          >
            {conversation.last_preview || formatPhoneForDisplay(conversation.customer_phone)}
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyInboxState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border mb-3.5">
        <MessageCircle size={18} className="text-paper-text-3 dark:text-ink-text-3" />
      </div>
      <h3 className="text-[13.5px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 mb-1">
        {hasSearch ? 'No matches' : 'No conversations yet'}
      </h3>
      <p className="text-[12px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 max-w-[240px]">
        {hasSearch
          ? 'Try a different name, phone or keyword.'
          : 'WhatsApp threads appear here once a customer messages your business number.'}
      </p>
    </div>
  );
}

function AIQueriesList({ queries }: { queries: AIQueryRow[] }) {
  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border mb-3.5">
          <Bot size={18} className="text-paper-text-3 dark:text-ink-text-3" />
        </div>
        <h3 className="text-[13.5px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 mb-1">
          Nothing yet
        </h3>
        <p className="text-[12px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 max-w-[260px]">
          ChatGPT, Claude, and Gemini bookings appear here once your business is live on mcp.openbook.ie.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-paper-border dark:divide-ink-border">
      {queries.map((q) => (
        <li key={q.id} className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bot size={12} className="text-paper-text-3 dark:text-ink-text-3" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3">
              {q.source}
            </span>
            {q.region && (
              <span className="text-[10.5px] text-paper-text-3 dark:text-ink-text-3">
                · {q.region}
              </span>
            )}
            <span className="ml-auto text-[10.5px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
              {timeAgoShort(q.created_at)}
            </span>
          </div>
          <p className="text-[12.5px] leading-snug text-paper-text-1 dark:text-ink-text-1">
            {q.query}
          </p>
          {q.resulted_in_booking_id && (
            <span className="inline-block mt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-gold bg-gold-soft border border-gold-border rounded-[3px] px-1.5 py-0.5">
              Booking made
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
