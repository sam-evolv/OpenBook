import { Target, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import type { ArchivedInsight } from '@/lib/dashboard-v2/intelligence-queries';
import { cn } from '@/lib/utils';

interface RecentInsightsProps {
  insights: ArchivedInsight[];
}

function kindFor(type: string) {
  switch (type) {
    case 'opportunity':
      return {
        label: 'Opportunity',
        Icon: Target,
        colour: 'text-gold',
      };
    case 'warning':
      return {
        label: 'At risk',
        Icon: AlertTriangle,
        colour: 'text-amber-600 dark:text-amber-400',
      };
    case 'trend':
      return {
        label: 'Pattern',
        Icon: Activity,
        colour: 'text-blue-600 dark:text-blue-400',
      };
    default:
      return {
        label: type.replace(/_/g, ' '),
        Icon: Sparkles,
        colour: 'text-paper-text-2 dark:text-ink-text-2',
      };
  }
}

function monthHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
  });
}

export function RecentInsights({ insights }: RecentInsightsProps) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Insights appear here as your business finds its pattern"
        description="Give it about two weeks of bookings and we'll start archiving opportunities, at-risk signals, and patterns worth acting on."
      />
    );
  }

  // Group by YYYY-MM keeping input order (already newest first).
  const groups = new Map<string, ArchivedInsight[]>();
  for (const ins of insights) {
    const d = new Date(ins.generated_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const arr = groups.get(key) ?? [];
    arr.push(ins);
    groups.set(key, arr);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-gold-soft border border-gold-border">
          <Sparkles size={11} className="text-gold" />
        </div>
        <h2 className="text-[15px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
          Recent insights
        </h2>
        <span className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
          Archive — dismissed entries stay visible, dimmed
        </span>
      </div>
      <Card padding="none">
        <ul className="divide-y divide-paper-border dark:divide-ink-border">
          {Array.from(groups.entries()).map(([monthKey, group]) => (
            <li key={monthKey}>
              <div className="px-5 pt-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3 bg-paper-surface2/40 dark:bg-ink-surface2/40">
                {monthHeader(group[0]!.generated_at)}
              </div>
              <ul className="divide-y divide-paper-border dark:divide-ink-border">
                {group.map((ins) => {
                  const kind = kindFor(ins.insight_type);
                  const { Icon } = kind;
                  return (
                    <li
                      key={ins.id}
                      className={cn(
                        'grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-3.5',
                        ins.dismissed && 'opacity-50',
                      )}
                    >
                      <div className="flex items-center gap-1.5 pt-0.5 min-w-[88px]">
                        <Icon size={11} className={kind.colour} />
                        <span
                          className={cn(
                            'text-[10.5px] font-semibold uppercase tracking-[0.3px]',
                            kind.colour,
                          )}
                        >
                          {kind.label}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            'text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1 leading-snug',
                            ins.dismissed && 'line-through decoration-paper-text-3 dark:decoration-ink-text-3',
                          )}
                        >
                          {ins.headline}
                        </div>
                        <div className="mt-1 text-[12.5px] leading-relaxed text-paper-text-2 dark:text-ink-text-2">
                          {ins.body}
                        </div>
                      </div>
                      <div className="text-[11px] tabular-nums text-paper-text-3 dark:text-ink-text-3 pt-1">
                        {formatDate(ins.generated_at)}
                        {ins.dismissed && (
                          <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.3px]">
                            Dismissed
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
