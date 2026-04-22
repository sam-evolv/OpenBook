'use client';

import { useState, useTransition } from 'react';
import { Target, Pencil } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Drawer } from '../Drawer';
import { formatPrice } from '@/lib/supabase';
import { saveMonthlyRevenueGoal } from '@/app/(dashboard)/dashboard/overview/actions';
import type { GoalPayload } from '@/lib/dashboard-v2/overview-queries';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  data: GoalPayload;
  previewMode?: boolean;
}

function paceStatus(
  monthToDate: number,
  expectedByNow: number | null,
): { label: string; tone: 'ahead' | 'on' | 'behind' | 'none' } {
  if (expectedByNow === null) return { label: '', tone: 'none' };
  const diff = monthToDate - expectedByNow;
  if (Math.abs(diff) < Math.max(50, expectedByNow * 0.02)) {
    return { label: 'On pace', tone: 'on' };
  }
  if (diff > 0) {
    return { label: `Ahead by €${Math.round(diff).toLocaleString()}`, tone: 'ahead' };
  }
  return { label: `Behind by €${Math.round(-diff).toLocaleString()}`, tone: 'behind' };
}

export function GoalCard({ data, previewMode }: GoalCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<string>(data.goal != null ? String(data.goal) : '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const openEdit = () => {
    setDraft(data.goal != null ? String(data.goal) : '');
    setError(null);
    setDrawerOpen(true);
  };

  const onSave = () => {
    const amount = draft.trim() === '' ? null : Number(draft);
    if (amount != null && (Number.isNaN(amount) || amount < 0)) {
      setError('Enter a positive number, or leave blank to clear the goal.');
      return;
    }
    if (previewMode) {
      setDrawerOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await saveMonthlyRevenueGoal(amount);
      if (res.ok) setDrawerOpen(false);
      else setError(res.error);
    });
  };

  // Empty state: no goal set
  if (data.goal == null) {
    return (
      <>
        <Card variant="gold">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold-soft border border-gold-border">
              <Target size={15} className="text-gold" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-paper-text-1 dark:text-ink-text-1">
                Set a monthly revenue goal
              </div>
              <div className="text-[12.5px] text-paper-text-2 dark:text-ink-text-2 mt-0.5">
                {data.monthLabel} is under way. A goal gives you a pace target and shows whether
                you're on track each day.
              </div>
            </div>
            <Button variant="primary" size="md" onClick={openEdit}>
              Set goal
            </Button>
          </div>
        </Card>
        {renderDrawer(drawerOpen, setDrawerOpen, draft, setDraft, onSave, isPending, error)}
      </>
    );
  }

  const pace = paceStatus(data.monthToDate, data.expectedByNow);

  return (
    <>
      <Card variant="gold">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <Target size={13} className="text-gold" />
            <div className="text-[13px] font-semibold text-paper-text-1 dark:text-ink-text-1">
              {data.monthLabel} goal
            </div>
            <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
              {data.daysRemaining} {data.daysRemaining === 1 ? 'day' : 'days'} remaining
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pace.tone !== 'none' && (
              <div
                className={cn(
                  'text-[12px] font-semibold tabular-nums',
                  pace.tone === 'ahead' && 'text-gold',
                  pace.tone === 'on' && 'text-emerald-500 dark:text-emerald-400',
                  pace.tone === 'behind' && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {pace.label}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil size={12} strokeWidth={2} />}
              onClick={openEdit}
              aria-label="Edit goal"
            >
              Edit
            </Button>
          </div>
        </div>
        <div className="flex items-baseline gap-2.5 mb-2.5">
          <div className="text-[22px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1 tracking-tight">
            {formatPrice(data.monthToDate * 100)}
          </div>
          <div className="text-[13px] text-paper-text-3 dark:text-ink-text-3">
            of {formatPrice(data.goal * 100)} goal
          </div>
          <div className="flex-1" />
          <div className="text-[12px] tabular-nums text-paper-text-2 dark:text-ink-text-2">
            {data.pctComplete ?? 0}%
          </div>
        </div>
        <div className="relative h-[6px] bg-paper-surface2 dark:bg-ink-surface2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, data.pctComplete ?? 0)}%`,
              background: 'linear-gradient(90deg, #D4AF37 0%, #B8934C 100%)',
            }}
          />
          {data.expectedByNow != null && data.goal > 0 && (
            <div
              className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-paper-text-3/40 dark:bg-ink-text-3/40"
              style={{
                left: `${Math.min(100, (data.expectedByNow / data.goal) * 100)}%`,
              }}
              aria-hidden
            />
          )}
        </div>
      </Card>
      {renderDrawer(drawerOpen, setDrawerOpen, draft, setDraft, onSave, isPending, error)}
    </>
  );
}

function renderDrawer(
  open: boolean,
  setOpen: (v: boolean) => void,
  draft: string,
  setDraft: (v: string) => void,
  onSave: () => void,
  isPending: boolean,
  error: string | null,
) {
  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title="Monthly revenue goal"
      subtitle="Set the number you're aiming for this month."
      footer={
        <>
          <div className="flex-1" />
          <Button variant="ghost" size="md" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={onSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save goal'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2 mb-1.5">
            Goal (€)
          </label>
          <input
            type="number"
            min={0}
            step={100}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. 14000"
            className="h-11 w-full rounded-md border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-3 text-[14px] tabular-nums text-paper-text-1 dark:text-ink-text-1 outline-none focus:ring-2 focus:ring-gold focus:border-gold"
          />
          <p className="mt-2 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">
            Leave blank to clear the goal and go back to the prompt.
          </p>
        </div>
        {error && <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>}
      </div>
    </Drawer>
  );
}
