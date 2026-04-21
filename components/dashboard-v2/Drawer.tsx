'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthClasses = {
  sm: 'w-full sm:w-[360px]',
  md: 'w-full sm:w-[440px]',
  lg: 'w-full sm:w-[540px]',
} as const;

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'absolute right-0 top-0 bottom-0 flex flex-col animate-slide-in-right',
          'bg-paper-bg dark:bg-ink-bg border-l border-paper-border dark:border-ink-border',
          widthClasses[width],
        )}
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-paper-border dark:border-ink-border">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] text-paper-text-3 dark:text-ink-text-3">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-paper-text-3 dark:text-ink-text-3 hover:bg-paper-surface2 dark:hover:bg-ink-surface2 hover:text-paper-text-1 dark:hover:text-ink-text-1 transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="px-6 py-4 border-t border-paper-border dark:border-ink-border flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
