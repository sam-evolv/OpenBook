import { cn } from '@/lib/utils';

type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

interface StatusPillProps {
  status: Status;
  children: React.ReactNode;
  dot?: boolean;
}

const statusClasses: Record<Status, string> = {
  success:
    'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/50',
  warning:
    'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/50',
  danger:
    'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/50',
  info: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/50',
  neutral:
    'text-paper-text-2 bg-paper-surface2 border-paper-border dark:text-ink-text-2 dark:bg-ink-surface2 dark:border-ink-border',
  gold: 'text-gold bg-gold-soft border-gold-border',
};

const dotColorClasses: Record<Status, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-paper-text-3 dark:bg-ink-text-3',
  gold: 'bg-gold',
};

export function StatusPill({ status, children, dot = false }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border text-[10.5px] font-semibold uppercase tracking-[0.3px]',
        statusClasses[status],
      )}
    >
      {dot && <span className={cn('h-1 w-1 rounded-full', dotColorClasses[status])} />}
      {children}
    </span>
  );
}
