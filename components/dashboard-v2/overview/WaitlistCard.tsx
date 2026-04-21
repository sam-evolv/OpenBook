'use client';

import { useState, useTransition } from 'react';
import { Clock3, MessageCircle, Check } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Avatar } from '../Avatar';
import { markWaitlistNotified } from '@/app/(dashboard-v2)/v2/overview/actions';
import type { WaitlistEntry } from '@/lib/dashboard-v2/overview-queries';

interface WaitlistCardProps {
  entries: WaitlistEntry[];
  previewMode?: boolean;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function formatRequested(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function WaitlistCard({ entries, previewMode }: WaitlistCardProps) {
  if (entries.length === 0) {
    return (
      <Card padding="none">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-paper-border dark:border-ink-border">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <Clock3 size={12} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1">
            Waitlist
          </div>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2 max-w-md mx-auto">
            Nobody on the waitlist yet. When a slot opens and a customer wants in, they'll show up
            here with a one-tap WhatsApp notify.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-paper-border dark:border-ink-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <Clock3 size={12} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1">
            Waitlist
          </div>
          <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Auto-notifies when slots open · {entries.length} waiting
          </div>
        </div>
      </div>
      <ul className="divide-y divide-paper-border dark:divide-ink-border">
        {entries.map((e) => (
          <WaitlistRow key={e.id} entry={e} previewMode={previewMode} />
        ))}
      </ul>
    </Card>
  );
}

function WaitlistRow({ entry, previewMode }: { entry: WaitlistEntry; previewMode?: boolean }) {
  const [notified, setNotified] = useState<boolean>(!!entry.notified_at);
  const [isPending, startTransition] = useTransition();

  const onNotify = () => {
    if (previewMode) {
      setNotified(true);
      return;
    }
    startTransition(async () => {
      const res = await markWaitlistNotified(entry.id);
      if (res.ok) setNotified(true);
    });
  };

  return (
    <li className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3">
      <Avatar name={entry.customer_name} size="sm" />
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-paper-text-1 dark:text-ink-text-1 truncate">
          {entry.customer_name}
        </div>
        <div className="text-[11px] text-paper-text-3 dark:text-ink-text-3">
          added {timeAgo(entry.added_at)}
        </div>
      </div>
      <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 tabular-nums truncate">
        {formatRequested(entry.requested_date)}
      </div>
      <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 truncate">
        {entry.service_name ?? '—'}
      </div>
      <Button
        variant={notified ? 'ghost' : 'secondary'}
        size="sm"
        icon={
          notified ? (
            <Check size={12} strokeWidth={2.5} />
          ) : (
            <MessageCircle size={12} strokeWidth={2} />
          )
        }
        onClick={onNotify}
        disabled={notified || isPending}
      >
        {notified ? 'Notified' : 'Notify'}
      </Button>
    </li>
  );
}
