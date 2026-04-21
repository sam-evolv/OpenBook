import { cn } from '@/lib/utils';

interface MetricBlockProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  align?: 'left' | 'right';
  minWidth?: number;
}

export function MetricBlock({
  label,
  value,
  sub,
  accent = false,
  align = 'left',
  minWidth,
}: MetricBlockProps) {
  return (
    <div
      className={cn(align === 'right' && 'text-right')}
      style={minWidth ? { minWidth } : undefined}
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
        {label}
      </div>
      <div
        className={cn(
          'text-sm font-semibold mt-0.5 tabular-nums tracking-tight',
          accent ? 'text-gold' : 'text-paper-text-1 dark:text-ink-text-1',
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-paper-text-3 dark:text-ink-text-3 mt-0.5">{sub}</div>}
    </div>
  );
}
