'use client';

import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import type { HeatmapCell, HeatmapSummary } from '@/lib/analytics/computeHeatmap';
import {
  formatHourRange,
  heatmapDayName,
} from '@/lib/analytics/computeHeatmap';
import { formatEuro } from '@/lib/analytics/summary';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

type Props = {
  summary: HeatmapSummary;
  hasEnoughData: boolean;
};

export function DemandHeatmap({ summary, hasEnoughData }: Props) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);
  const cellsByIndex = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const c of summary.cells) map.set(`${c.day}:${c.hour}`, c);
    return map;
  }, [summary]);

  return (
    <section className="bg-[#0f1115]">
      <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-gold" />
            <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
              Peak demand + capacity
            </span>
          </div>
          <h2 className="mt-2 font-display text-[22px] text-paper leading-tight tracking-tight">
            Where your week actually happens.
          </h2>
          <p className="mt-1 text-[12.5px] text-paper/55 max-w-xl">
            Weekly average bookings per hour across the last 90 days. Saturation =
            slots booked out of capacity available.
          </p>
        </div>
        <Legend />
      </header>

      <div className="px-6 pt-5 pb-6">
        <div className="overflow-x-auto -mx-6 px-6 pb-2 no-scrollbar">
          <div
            className="grid gap-[3px] min-w-[820px]"
            style={{
              gridTemplateColumns: `60px repeat(${HOURS.length}, minmax(22px, 1fr))`,
            }}
          >
            {/* header row */}
            <div />
            {HOURS.map((h) => (
              <div
                key={`h-${h}`}
                className={`font-mono text-[9.5px] tracking-[0.1em] uppercase text-paper/35 text-center ${h % 3 === 0 ? '' : 'opacity-0'}`}
              >
                {labelForHour(h)}
              </div>
            ))}

            {DAYS.map((day) => (
              <Row
                key={day}
                day={day}
                cellsByIndex={cellsByIndex}
                onHover={setHovered}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 min-h-[22px] text-[12px] text-paper/60 font-mono tracking-wide">
          {hovered ? (
            <HoverLabel cell={hovered} />
          ) : hasEnoughData ? (
            <span className="text-paper/35">Hover any cell for details.</span>
          ) : (
            <span className="text-paper/35">
              We&apos;ll fill this heatmap in as your bookings come in over the next 2 weeks.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({
  day,
  cellsByIndex,
  onHover,
}: {
  day: number;
  cellsByIndex: Map<string, HeatmapCell>;
  onHover: (c: HeatmapCell | null) => void;
}) {
  return (
    <>
      <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-paper/55 flex items-center">
        {heatmapDayName(day).slice(0, 3)}
      </div>
      {HOURS.map((hour) => {
        const cell = cellsByIndex.get(`${day}:${hour}`);
        if (!cell) return <div key={`${day}-${hour}`} />;
        return (
          <Cell
            key={`${day}-${hour}`}
            cell={cell}
            onEnter={() => onHover(cell)}
            onLeave={() => onHover(null)}
          />
        );
      })}
    </>
  );
}

function Cell({
  cell,
  onEnter,
  onLeave,
}: {
  cell: HeatmapCell;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const closed = cell.capacity === 0;
  const u = cell.utilisation; // 0..1

  const background = closed
    ? 'rgba(255,255,255,0.015)'
    : u === 0
      ? 'rgba(212,175,55,0.04)'
      : `rgba(212,175,55,${0.12 + u * 0.78})`;

  const border = closed
    ? '1px dashed rgba(255,255,255,0.04)'
    : u >= 0.9
      ? '1px solid rgba(212,175,55,0.9)'
      : '1px solid rgba(212,175,55,0.12)';

  return (
    <button
      type="button"
      tabIndex={closed ? -1 : 0}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      aria-label={`${heatmapDayName(cell.day)} ${formatHourRange(cell.hour)}, ${Math.round(u * 100)}% utilisation`}
      className="h-6 rounded-[3px] transition-transform duration-150 ease-premium hover:scale-[1.15] focus:outline-none"
      style={{ background, border }}
    />
  );
}

function Legend() {
  const stops = [0.1, 0.3, 0.5, 0.7, 0.9];
  return (
    <div className="hidden sm:flex items-center gap-3">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-paper/40">
        Low
      </span>
      <div className="flex gap-1">
        {stops.map((s) => (
          <span
            key={s}
            className="h-3 w-3 rounded-sm"
            style={{
              background: `rgba(212,175,55,${0.12 + s * 0.78})`,
              border: '1px solid rgba(212,175,55,0.25)',
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-paper/40">
        High
      </span>
    </div>
  );
}

function HoverLabel({ cell }: { cell: HeatmapCell }) {
  return (
    <span>
      <span className="text-paper">{heatmapDayName(cell.day)}</span>{' '}
      <span className="text-paper/65">{formatHourRange(cell.hour)}</span>{' '}
      <span className="text-paper/40">·</span>{' '}
      <span className="text-paper/80 tabular-nums">
        {cell.bookings.toFixed(1)} bookings/week
      </span>{' '}
      <span className="text-paper/40">·</span>{' '}
      <span className="text-gold tabular-nums">
        {Math.round(cell.utilisation * 100)}% full
      </span>
      {cell.revenueCents > 0 && (
        <>
          {' '}
          <span className="text-paper/40">·</span>{' '}
          <span className="text-paper/60 tabular-nums">
            {formatEuro(cell.revenueCents)}/wk
          </span>
        </>
      )}
    </span>
  );
}

function labelForHour(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}
