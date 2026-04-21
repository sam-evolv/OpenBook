import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gold' | 'info' | 'warning' | 'danger' | 'purple';
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const;

const variantMap = {
  default: 'bg-paper-surface border-paper-border dark:bg-ink-surface dark:border-ink-border',
  gold: 'bg-gradient-to-br from-gold-soft to-transparent border-gold-border',
  info: 'bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20 border-blue-200 dark:border-blue-900/40',
  warning: 'bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20 border-amber-200 dark:border-amber-900/40',
  danger: 'bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/20 border-red-200 dark:border-red-900/40',
  purple: 'bg-gradient-to-br from-violet-50 to-transparent dark:from-violet-950/20 border-violet-200 dark:border-violet-900/40',
} as const;

export function Card({
  children,
  padding = 'md',
  variant = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border shadow-card-light dark:shadow-card-dark',
        paddingMap[padding],
        variantMap[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
