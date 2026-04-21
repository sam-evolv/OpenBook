import type { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Card } from './Card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  secondary?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, secondary }: EmptyStateProps) {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-center text-center py-8 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-paper-surface2 dark:bg-ink-surface2 border border-paper-border dark:border-ink-border mb-4">
          <Icon size={20} className="text-paper-text-3 dark:text-ink-text-3" />
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1 mb-1.5">
          {title}
        </h3>
        <p className="text-[13px] leading-relaxed text-paper-text-2 dark:text-ink-text-2 max-w-md mb-6">
          {description}
        </p>
        {(action || secondary) && (
          <div className="flex items-center gap-2">
            {action}
            {secondary}
          </div>
        )}
      </div>
    </Card>
  );
}
