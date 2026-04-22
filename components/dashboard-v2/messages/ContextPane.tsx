'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, User, Copy, Check, UserPlus } from 'lucide-react';
import { Button } from '../Button';
import type {
  InboxConversation,
  CustomerContext,
} from '@/lib/dashboard-v2/messages-queries';
import { formatPhoneForDisplay } from '@/lib/dashboard-v2/customer';
import { formatPrice } from '@/lib/supabase';

interface ContextPaneProps {
  conversation: InboxConversation;
  customer: CustomerContext | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function ContextPane({ conversation, customer }: ContextPaneProps) {
  const [copied, setCopied] = useState(false);

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(conversation.customer_phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  // Calendar deep-link: we can only anchor the view by date, not yet by
  // booking id. Link to today's week in the calendar — owners can pivot
  // from there. Flagged as polish in the Messages brief.
  const calendarHref = customer?.last_booking_at
    ? `/dashboard/calendar?date=${encodeURIComponent(customer.last_booking_at)}`
    : '/dashboard/calendar';

  // Customer deep-link: if matched, pre-fill Customers search with the
  // name (since `?open=<id>` isn't wired yet). If not matched, fall back
  // to phone search.
  const customerHref = customer
    ? `/dashboard/customers?q=${encodeURIComponent(customer.display_name)}`
    : `/dashboard/customers?q=${encodeURIComponent(conversation.customer_phone)}`;

  return (
    <aside className="flex h-full w-[320px] flex-col border-l border-paper-border dark:border-ink-border bg-paper-bg dark:bg-ink-bg">
      <div className="px-5 pt-5 pb-4 border-b border-paper-border dark:border-ink-border">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3 mb-3">
          Context
        </div>
        {customer ? (
          <MatchedCustomerHeader customer={customer} />
        ) : (
          <UnknownCustomerHeader conversation={conversation} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {customer && <CustomerStats customer={customer} />}

        <div className="p-5 space-y-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3 mb-0.5">
            Quick actions
          </div>

          <Link href={customerHref} className="block">
            <Button
              variant="secondary"
              size="md"
              icon={customer ? <User size={13} /> : <UserPlus size={13} />}
              className="w-full !justify-start"
            >
              {customer ? 'Open customer' : 'Search customers'}
            </Button>
          </Link>

          <Link href={calendarHref} className="block">
            <Button
              variant="secondary"
              size="md"
              icon={<Calendar size={13} />}
              className="w-full !justify-start"
            >
              Open in Calendar
            </Button>
          </Link>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={copyPhone}
            icon={copied ? <Check size={13} /> : <Copy size={13} />}
            className="w-full !justify-start"
          >
            {copied ? 'Copied' : 'Copy phone number'}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function MatchedCustomerHeader({ customer }: { customer: CustomerContext }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-paper-surface2 to-paper-borderStrong dark:from-ink-surface2 dark:to-ink-borderStrong text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1">
          {customer.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 truncate">
            {customer.display_name}
          </div>
          <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 font-mono">
            {customer.phone ? formatPhoneForDisplay(customer.phone) : '—'}
          </div>
        </div>
      </div>
      {customer.email && (
        <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 truncate">
          {customer.email}
        </div>
      )}
    </div>
  );
}

function UnknownCustomerHeader({ conversation }: { conversation: InboxConversation }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-surface2 dark:bg-ink-surface2 border border-dashed border-paper-borderStrong dark:border-ink-borderStrong text-paper-text-3 dark:text-ink-text-3">
          <User size={15} />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 truncate">
            {conversation.display_name}
          </div>
          <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3 font-mono">
            {formatPhoneForDisplay(conversation.customer_phone)}
          </div>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
        No customer record yet — they've messaged but haven't booked with you.
      </p>
    </div>
  );
}

function CustomerStats({ customer }: { customer: CustomerContext }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-5 border-b border-paper-border dark:border-ink-border">
      <StatBlock label="Bookings" value={customer.booking_count.toString()} />
      <StatBlock
        label="Lifetime"
        value={formatPrice(customer.lifetime_value_cents)}
      />
      <StatBlock label="Last booking" value={formatDate(customer.last_booking_at)} span={2} />
    </div>
  );
}

function StatBlock({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: number;
}) {
  return (
    <div
      className="rounded-lg border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 py-2.5"
      style={span === 2 ? { gridColumn: 'span 2 / span 2' } : undefined}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3 mb-1">
        {label}
      </div>
      <div className="text-[14px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
        {value}
      </div>
    </div>
  );
}
