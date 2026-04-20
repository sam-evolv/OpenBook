'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, TrendingUp, TrendingDown, ArrowRight, Calendar, Euro, Users, Sparkles, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

interface Props {
  business: any;
  ownerName?: string;
  stats: {
    todayCount: number;
    todayRevenue: number;
    weekCount: number;
    weekRevenue: number;
    lastWeekCount: number;
    lastWeekRevenue: number;
    customerCount: number;
  };
  upcoming: any[];
  checklist: {
    hasServices: boolean;
    hasHero: boolean;
    hasGallery: boolean;
    hasStripe: boolean;
    hasFirstBooking: boolean;
  };
}

export function OverviewClient({ business, ownerName, stats, upcoming, checklist }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `app.openbook.ie/business/${business.slug}`;

  function copyUrl() {
    navigator.clipboard.writeText(`https://${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const bookingsTrend = stats.lastWeekCount === 0 ? null : Math.round(((stats.weekCount - stats.lastWeekCount) / stats.lastWeekCount) * 100);

  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;
  const checklistComplete = checklistDone === checklistTotal;

  return (
    <div className="flex flex-col gap-8 dash-fade-in">
      {/* Header */}
      <div>
        <p
          className="text-[11px] font-medium tracking-[0.12em] uppercase mb-1.5"
          style={{ color: 'var(--fg-2)' }}
        >
          {getGreeting()}
        </p>
        <h1
          className="text-[32px] font-semibold leading-none"
          style={{ color: 'var(--fg-0)', letterSpacing: '-0.025em' }}
        >
          Welcome back{ownerName ? `, ${ownerName.split(' ')[0]}` : ''}.
        </h1>
      </div>

      {/* Hero share card */}
      <div
        className="dash-card dash-hero-grid relative overflow-hidden"
        style={{ background: 'var(--bg-1)' }}
      >
        <div className="relative p-6 flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-medium tracking-[0.12em] uppercase mb-2"
              style={{ color: 'var(--fg-2)' }}
            >
              Your booking page
            </p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span
                className="text-[20px] font-mono"
                style={{ color: 'var(--fg-2)' }}
              >
                https://
              </span>
              <span
                className="text-[24px] font-semibold font-mono"
                style={{ color: 'var(--fg-0)', letterSpacing: '-0.01em' }}
              >
                {shareUrl}
              </span>
            </div>
            <p
              className="mt-2 text-[13px]"
              style={{ color: 'var(--fg-1)' }}
            >
              Share this link anywhere. Every customer who taps it can book in 30 seconds.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyUrl}
              className="dash-btn-secondary"
              aria-label="Copy URL"
            >
              {copied ? (
                <>
                  <Check className="h-[14px] w-[14px]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-[14px] w-[14px]" />
                  Copy
                </>
              )}
            </button>
            <a
              href={`https://${shareUrl}`}
              target="_blank"
              rel="noreferrer"
              className="dash-btn-primary"
            >
              Visit
              <ExternalLink className="h-[14px] w-[14px]" />
            </a>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Bookings today"
          value={stats.todayCount}
          format="int"
        />
        <StatCard
          label="Revenue today"
          value={stats.todayRevenue}
          format="euro"
        />
        <StatCard
          label="This week"
          value={stats.weekCount}
          format="int"
          trend={bookingsTrend}
          sublabel={`€${(stats.weekRevenue / 100).toFixed(0)} revenue`}
        />
        <StatCard
          label="Customers"
          value={stats.customerCount}
          format="int"
        />
      </div>

      {/* Setup checklist (only if not complete) */}
      {!checklistComplete && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--fg-0)' }}>
              Get set up
            </h2>
            <span className="text-[12px] font-mono" style={{ color: 'var(--fg-2)' }}>
              {checklistDone}/{checklistTotal}
            </span>
          </div>
          <div className="dash-card p-1">
            <ChecklistItem done={checklist.hasServices} label="Add your services" href="/dashboard/services" />
            <ChecklistItem done={checklist.hasHero} label="Upload a hero image" href="/dashboard/settings" />
            <ChecklistItem done={checklist.hasGallery} label="Add gallery photos" href="/dashboard/settings" />
            <ChecklistItem done={checklist.hasStripe} label="Connect Stripe to accept payments" href="/dashboard/settings" />
            <ChecklistItem done={checklist.hasFirstBooking} label="Get your first booking" href={`https://${shareUrl}`} external />
          </div>
        </section>
      )}

      {/* Upcoming bookings */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--fg-0)' }}>
            Upcoming bookings
          </h2>
          {upcoming.length > 0 && (
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-1 text-[12px] font-medium"
              style={{ color: 'var(--fg-1)' }}
            >
              View all
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div
            className="dash-card p-10 text-center"
            style={{ background: 'var(--bg-1)' }}
          >
            <div
              className="mx-auto mb-3 h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-3)' }}
            >
              <Calendar className="h-4 w-4" style={{ color: 'var(--fg-2)' }} strokeWidth={1.6} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--fg-0)' }}>
              No upcoming bookings
            </p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--fg-2)' }}>
              Share your link above to start getting customers
            </p>
          </div>
        ) : (
          <div className="dash-card overflow-hidden">
            {upcoming.map((b, i) => (
              <UpcomingRow key={b.id} booking={b} isLast={i === upcoming.length - 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  format,
  trend,
  sublabel,
}: {
  label: string;
  value: number;
  format: 'int' | 'euro';
  trend?: number | null;
  sublabel?: string;
}) {
  const display = format === 'euro' ? `€${(value / 100).toFixed(0)}` : String(value);
  const isFirstWeek = trend === null;

  return (
    <div className="dash-card p-4" style={{ background: 'var(--bg-1)' }}>
      <p
        className="text-[11px] font-medium tracking-wider uppercase mb-2"
        style={{ color: 'var(--fg-2)' }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[28px] font-semibold tabular-nums leading-none"
          style={{ color: 'var(--fg-0)', letterSpacing: '-0.02em' }}
        >
          {display}
        </span>
        {typeof trend === 'number' && trend !== 0 && (
          <span
            className="flex items-center gap-0.5 text-[11px] font-medium font-mono"
            style={{ color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}
          >
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" strokeWidth={2} />
            ) : (
              <TrendingDown className="h-3 w-3" strokeWidth={2} />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sublabel && (
        <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--fg-2)' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  href,
  external,
}: {
  done: boolean;
  label: string;
  href: string;
  external?: boolean;
}) {
  const inner = (
    <div
      className="flex items-center gap-3 px-3 h-11 rounded-md transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {done ? (
        <CheckCircle2
          className="h-[16px] w-[16px] shrink-0"
          style={{ color: 'var(--success)' }}
          strokeWidth={2}
          fill="var(--success-bg)"
        />
      ) : (
        <Circle className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--fg-3)' }} strokeWidth={1.5} />
      )}
      <span
        className="flex-1 text-[13px]"
        style={{
          color: done ? 'var(--fg-2)' : 'var(--fg-0)',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {label}
      </span>
      {!done && (
        <ArrowRight className="h-[13px] w-[13px]" style={{ color: 'var(--fg-2)' }} strokeWidth={1.8} />
      )}
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

function UpcomingRow({ booking, isLast }: { booking: any; isLast: boolean }) {
  const date = new Date(booking.starts_at);
  const now = new Date();
  const hoursUntil = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
  const customerName = booking.customers?.first_name
    ? `${booking.customers.first_name} ${booking.customers.last_name ?? ''}`.trim()
    : 'Customer';

  const timeUntil =
    hoursUntil < 1 ? 'Soon' : hoursUntil < 24 ? `in ${hoursUntil}h` : `in ${Math.round(hoursUntil / 24)}d`;

  return (
    <div
      className="flex items-center gap-4 px-4 h-14"
      style={{
        borderBottom: isLast ? 'none' : '0.5px solid var(--border-1)',
      }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-md px-2 py-1 shrink-0 tabular-nums"
        style={{
          background: 'var(--accent-bg)',
          border: '0.5px solid var(--accent-border)',
          minWidth: 44,
        }}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          {date.toLocaleDateString('en-IE', { month: 'short' })}
        </span>
        <span className="text-[16px] font-semibold leading-none mt-0.5" style={{ color: 'var(--fg-0)' }}>
          {date.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--fg-0)' }}>
          {customerName}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--fg-2)' }}>
          {booking.services?.name ?? 'Service'} · {date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
          €{((booking.price_cents ?? 0) / 100).toFixed(0)}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--fg-2)' }}>
          {timeUntil}
        </span>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
