'use client';

import { Star } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { MetricBlock } from '../MetricBlock';
import { TILE_PALETTE_MAP } from '@/lib/tile-palette';
import { colourForStaff } from '@/lib/dashboard-v2/staff-colours';
import type { TeamStaffRow } from '@/lib/dashboard-v2/team-queries';
import { formatPrice } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface StaffCardProps {
  staff: TeamStaffRow;
  onManage: () => void;
}

export function StaffCard({ staff, onManage }: StaffCardProps) {
  const mid = TILE_PALETTE_MAP[colourForStaff(staff)].mid;

  return (
    <Card>
      <div className="grid grid-cols-[52px_1fr_auto_auto_auto_auto_auto] items-center gap-5">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[14px] font-bold text-black"
          style={{
            background: `linear-gradient(135deg, ${mid} 0%, ${mid}CC 100%)`,
            boxShadow: `0 0 0 1px ${mid}40`,
          }}
        >
          {initials(staff.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[15px] font-semibold text-paper-text-1 dark:text-ink-text-1 truncate">
              {staff.name}
            </div>
            {staff.title && (
              <>
                <div className="text-[12px] text-paper-text-3 dark:text-ink-text-3">·</div>
                <div className="text-[12px] text-paper-text-2 dark:text-ink-text-2 truncate">
                  {staff.title}
                </div>
              </>
            )}
            {staff.is_owner && (
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.3px] text-gold bg-gold-soft border border-gold-border rounded-[3px] px-1.5 py-0.5">
                Owner
              </span>
            )}
            {!staff.is_active && (
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3 bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border rounded-[3px] px-1.5 py-0.5">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-1 text-[11.5px] text-paper-text-3 dark:text-ink-text-3 truncate">
            {staff.hours_label}
          </div>
          {staff.specialties.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {staff.specialties.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="text-[10.5px] text-paper-text-2 dark:text-ink-text-2 bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border rounded px-1.5 py-0.5"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <MetricBlock label="This week" value={staff.bookings_week} sub="bookings" />
        <MetricBlock label="Month" value={staff.bookings_month} sub="bookings" />
        <MetricBlock
          label="Revenue"
          value={formatPrice(staff.revenue_month_cents)}
          sub="30d"
          accent
        />
        <div className="min-w-[90px]">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
            Utilisation
          </div>
          <div className="mt-1 text-[14px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
            {staff.utilisation_percent === null ? (
              <span className="text-paper-text-3 dark:text-ink-text-3 font-normal">—</span>
            ) : (
              `${staff.utilisation_percent}%`
            )}
          </div>
          <div className="mt-1 h-[3px] rounded bg-paper-border dark:bg-ink-border overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${staff.utilisation_percent ?? 0}%`,
                background: mid,
              }}
            />
          </div>
        </div>
        <div className="min-w-[70px]">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
            Rating
          </div>
          {staff.rating === null ? (
            <div className="mt-1 text-[14px] text-paper-text-3 dark:text-ink-text-3 font-normal">
              —
            </div>
          ) : (
            <>
              <div className="mt-1 flex items-center gap-1">
                <Star size={12} className="text-gold" fill="currentColor" />
                <div className="text-[14px] font-semibold tabular-nums text-paper-text-1 dark:text-ink-text-1">
                  {staff.rating}
                </div>
              </div>
              <div className="text-[10.5px] text-paper-text-3 dark:text-ink-text-3 mt-0.5">
                {staff.review_count} {staff.review_count === 1 ? 'review' : 'reviews'}
              </div>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onManage}>
          Manage
        </Button>
      </div>
    </Card>
  );
}
