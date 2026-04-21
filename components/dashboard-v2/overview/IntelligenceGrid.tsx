'use client';

import { useTransition, useState } from 'react';
import { Sparkles, Target, AlertTriangle, Activity, X, ArrowUpRight } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { dismissInsight } from '@/app/(dashboard-v2)/v2/overview/actions';
import type { InsightsPayload, InsightRow } from '@/lib/dashboard-v2/overview-queries';
import { cn } from '@/lib/utils';

interface IntelligenceGridProps {
  data: InsightsPayload;
  previewMode?: boolean;
}

function kindFor(type: string): {
  label: string;
  Icon: typeof Target;
  colour: string;
  bg: string;
  border: string;
} {
  switch (type) {
    case 'opportunity':
      return {
        label: 'Opportunity',
        Icon: Target,
        colour: 'text-gold',
        bg: 'bg-gold-soft',
        border: 'border-gold-border',
      };
    case 'warning':
      return {
        label: 'At risk',
        Icon: AlertTriangle,
        colour: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-200 dark:border-amber-900/50',
      };
    case 'trend':
      return {
        label: 'Pattern',
        Icon: Activity,
        colour: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-900/50',
      };
    default:
      return {
        label: type.replace(/_/g, ' '),
        Icon: Sparkles,
        colour: 'text-paper-text-2 dark:text-ink-text-2',
        bg: 'bg-paper-surface2 dark:bg-ink-surface2',
        border: 'border-paper-border dark:border-ink-border',
      };
  }
}

export function IntelligenceGrid({ data, previewMode }: IntelligenceGridProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = data.insights.filter((i) => !dismissed.has(i.id));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-gold-soft border border-gold-border">
            <Sparkles size={11} className="text-gold" />
          </div>
          <h2 className="text-[15px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
            Intelligence
          </h2>
          {data.newCount > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-gold bg-gold-soft border border-gold-border rounded px-1.5 py-0.5">
              {data.newCount} new
            </span>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Insights appear here as your business finds its pattern"
          description="Give it about two weeks of bookings and we'll start surfacing opportunities, at-risk signals, and patterns worth acting on."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((ins) => (
            <InsightCard key={ins.id} insight={ins} onDismiss={() => {
              setDismissed((s) => new Set(s).add(ins.id));
            }} previewMode={previewMode} />
          ))}
        </div>
      )}
    </section>
  );
}

function InsightCard({
  insight,
  onDismiss,
  previewMode,
}: {
  insight: InsightRow;
  onDismiss: () => void;
  previewMode?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const kind = kindFor(insight.insight_type);
  const { Icon } = kind;

  const handleDismiss = () => {
    if (previewMode) {
      onDismiss();
      return;
    }
    startTransition(async () => {
      onDismiss();
      await dismissInsight(insight.id);
    });
  };

  return (
    <Card padding="md" className="relative group">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Dismiss insight"
        className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded text-paper-text-3 dark:text-ink-text-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-paper-surface2 dark:hover:bg-ink-surface2 transition-opacity"
      >
        <X size={12} strokeWidth={1.75} />
      </button>
      <div className={cn('flex items-center gap-1.5 mb-3')}>
        <Icon size={12} className={kind.colour} />
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-[0.3px]',
            kind.colour,
          )}
        >
          {kind.label}
        </span>
      </div>
      <div className="text-[14px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 leading-snug mb-2 pr-4">
        {insight.headline}
      </div>
      <div className="text-[12.5px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 mb-3">
        {insight.body}
      </div>
      <div className="flex items-center justify-end pt-3 border-t border-paper-border dark:border-ink-border">
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-paper-text-2 dark:text-ink-text-2">
          Explore <ArrowUpRight size={12} />
        </span>
      </div>
    </Card>
  );
}
