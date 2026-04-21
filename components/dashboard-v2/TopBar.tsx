import { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b bg-paper-bg dark:bg-ink-bg border-paper-border dark:border-ink-border">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-paper-text-3 dark:text-ink-text-3">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
