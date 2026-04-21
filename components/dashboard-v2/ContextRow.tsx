import { cn } from '@/lib/utils';

interface ContextRowProps {
  label: string;
  value: string | number;
  accent?: boolean;
  highlight?: boolean;
}

export function ContextRow({ label, value, accent, highlight }: ContextRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-paper-border dark:border-ink-border">
      <div className="text-[11.5px] text-paper-text-3 dark:text-ink-text-3">{label}</div>
      <div
        className={cn(
          'text-[12.5px] font-medium tabular-nums',
          accent
            ? 'text-gold'
            : highlight
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-paper-text-1 dark:text-ink-text-1',
        )}
      >
        {value}
      </div>
    </div>
  );
}
