'use client';

import { useState } from 'react';
import { Calendar, Mail, Plus, Search, Sparkles, Inbox } from 'lucide-react';
import { Card } from '@/components/dashboard-v2/Card';
import { Button } from '@/components/dashboard-v2/Button';
import { TopBar } from '@/components/dashboard-v2/TopBar';
import { Metric } from '@/components/dashboard-v2/Metric';
import { MetricBlock } from '@/components/dashboard-v2/MetricBlock';
import { ContextRow } from '@/components/dashboard-v2/ContextRow';
import { FieldRow } from '@/components/dashboard-v2/FieldRow';
import { StatusPill } from '@/components/dashboard-v2/StatusPill';
import { Avatar } from '@/components/dashboard-v2/Avatar';
import { EmptyState } from '@/components/dashboard-v2/EmptyState';
import { MetricSkeleton, CardSkeleton } from '@/components/dashboard-v2/Skeleton';
import { Sidebar } from '@/components/dashboard-v2/Sidebar';
import { ThemeProvider } from '@/components/dashboard-v2/ThemeProvider';

const sparklineSample = [
  { v: 12 },
  { v: 18 },
  { v: 14 },
  { v: 22 },
  { v: 19 },
  { v: 28 },
  { v: 32 },
  { v: 27 },
  { v: 34 },
];

function handleToggle(current: 'dark' | 'light') {
  const next = current === 'dark' ? 'light' : 'dark';
  document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}

export function PreviewContent({ initialTheme }: { initialTheme: 'dark' | 'light' }) {
  const [theme] = useState<'dark' | 'light'>(initialTheme);

  return (
    <div className="min-h-screen bg-paper-bg dark:bg-ink-bg">
      <TopBar
        title="Design system preview"
        subtitle="Throwaway page for Phase 1 visual verification. Delete before final merge."
        actions={
          <Button variant="secondary" size="md" onClick={() => handleToggle(theme)}>
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </Button>
        }
      />

      <div className="mx-auto max-w-6xl px-8 py-8 space-y-12">
        <PreviewSection title="Buttons" note="Four variants × three sizes">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm">Primary sm</Button>
            <Button variant="primary" size="md">Primary md</Button>
            <Button variant="primary" size="lg" icon={<Plus size={14} strokeWidth={2} />}>Primary lg</Button>
            <Button variant="secondary" size="md">Secondary</Button>
            <Button variant="secondary" size="md" icon={<Search size={13} strokeWidth={2} />} iconPosition="left">With icon</Button>
            <Button variant="ghost" size="md">Ghost</Button>
            <Button variant="danger" size="md">Danger</Button>
            <Button variant="primary" size="md" disabled>Disabled</Button>
          </div>
        </PreviewSection>

        <PreviewSection title="Metrics" note="Big-number cards with optional sparklines">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Metric
              label="Revenue this week"
              value="4,280"
              prefix="€"
              delta={12}
              sparkline={sparklineSample}
              accent
            />
            <Metric label="Bookings" value={42} delta={-6} sparkline={sparklineSample} />
            <Metric label="Show rate" value={94} suffix="%" delta={2} />
          </div>
        </PreviewSection>

        <PreviewSection title="Cards" note="Six surface variants">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="default">
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3 mb-2">Default</div>
              <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2">The workhorse surface used across every page.</p>
            </Card>
            <Card variant="gold">
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-gold mb-2">Gold</div>
              <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2">Flash sales, AI distribution, premium callouts.</p>
            </Card>
            <Card variant="info">
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-blue-600 dark:text-blue-400 mb-2">Info</div>
              <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2">Inline tips and non-blocking hints.</p>
            </Card>
            <Card variant="warning">
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-amber-600 dark:text-amber-400 mb-2">Warning</div>
              <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2">Quiet-window nudges, approaching limits.</p>
            </Card>
            <Card variant="danger">
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-red-600 dark:text-red-400 mb-2">Danger</div>
              <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2">Failed payouts, churned customers.</p>
            </Card>
            <Card variant="purple">
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-violet-600 dark:text-violet-400 mb-2">Purple</div>
              <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2">AI-generated insights and MCP-sourced signals.</p>
            </Card>
          </div>
        </PreviewSection>

        <PreviewSection title="Metric blocks" note="Compact label / value pairs for list rows">
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricBlock label="Upcoming" value={12} sub="Next 7 days" />
              <MetricBlock label="Revenue" value="€4,280" accent />
              <MetricBlock label="Avg ticket" value="€82" align="right" />
              <MetricBlock label="Show rate" value="94%" sub="+2% vs last week" align="right" />
            </div>
          </Card>
        </PreviewSection>

        <PreviewSection title="Context rows" note="Right-pane key/value pairs (Messages screen)">
          <Card>
            <ContextRow label="Customer" value="Aoife M." />
            <ContextRow label="Lifetime value" value="€1,240" accent />
            <ContextRow label="Last visit" value="3 weeks ago" />
            <ContextRow label="Source" value="ChatGPT search" highlight />
            <ContextRow label="Rebook rate" value="78%" />
          </Card>
        </PreviewSection>

        <PreviewSection title="Form fields" note="Text / textarea with optional icon + help">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="Business name" defaultValue="Evolv Performance" />
            <FieldRow label="Support email" defaultValue="hello@evolv.ie" icon={<Mail size={13} />} help="Customers reply here." />
            <FieldRow label="About the business" defaultValue="" placeholder="Tell customers what makes you different…" multi rows={4} />
            <FieldRow label="Phone" defaultValue="not-a-valid-phone" error="Must be a valid Irish mobile number." icon={<Calendar size={13} />} />
          </div>
        </PreviewSection>

        <PreviewSection title="Status pills" note="Inline status labels">
          <div className="flex flex-wrap gap-2">
            <StatusPill status="success" dot>Confirmed</StatusPill>
            <StatusPill status="warning" dot>Quiet window</StatusPill>
            <StatusPill status="danger" dot>No-show</StatusPill>
            <StatusPill status="info">AI draft</StatusPill>
            <StatusPill status="neutral">Draft</StatusPill>
            <StatusPill status="gold">Live</StatusPill>
          </div>
        </PreviewSection>

        <PreviewSection title="Avatars" note="Four sizes · online & favourited indicators · coloured variant">
          <div className="flex items-end gap-5">
            <Avatar name="Aoife Moran" size="xs" />
            <Avatar name="Niamh O'Shea" size="sm" online />
            <Avatar name="Róisín Kelly" size="md" favourited />
            <Avatar name="Saoirse Ryan" size="lg" color="#7C3AED" />
          </div>
        </PreviewSection>

        <PreviewSection title="Empty state" note="First-run UX shell">
          <EmptyState
            icon={Inbox}
            title="No bookings yet"
            description="When customers book through your business page or AI assistants, they'll show up here."
            action={<Button variant="primary" icon={<Plus size={13} strokeWidth={2} />}>Create first booking</Button>}
            secondary={<Button variant="ghost">Import from Calendly</Button>}
          />
        </PreviewSection>

        <PreviewSection title="Skeletons" note="Loading placeholders">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
          <CardSkeleton rows={3} />
        </PreviewSection>

        <PreviewSection title="Sidebar" note="244px nav with workspace switcher, search, AI badge, theme toggle">
          <div className="rounded-xl border border-paper-border dark:border-ink-border overflow-hidden" style={{ height: 720 }}>
            <ThemeProvider initialMode={theme}>
              <div className="flex h-full">
                <Sidebar
                  businessName="Evolv Performance"
                  businessSlug="evolv"
                  userName="Sam Don Worth"
                  userInitials="SD"
                  plan="Pro"
                  unreadMessagesCount={4}
                  upcomingBookingsCount={12}
                  hasLiveFlashSale
                />
                <div className="flex-1 p-8 bg-paper-bg dark:bg-ink-bg">
                  <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3">
                    (Content area — left sidebar is the preview.)
                  </div>
                </div>
              </div>
            </ThemeProvider>
          </div>
        </PreviewSection>

        <div className="pt-6 border-t border-paper-border dark:border-ink-border">
          <div className="flex items-center gap-2 text-[12px] text-paper-text-3 dark:text-ink-text-3">
            <Sparkles size={12} className="text-gold" />
            <span>
              Current theme: <span className="text-paper-text-1 dark:text-ink-text-1 font-medium">{theme}</span>. Click the button in the top bar to flip modes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-text-3 dark:text-ink-text-3">
          {title}
        </h2>
        {note && <span className="text-[12px] text-paper-text-3 dark:text-ink-text-3">{note}</span>}
      </div>
      {children}
    </section>
  );
}
