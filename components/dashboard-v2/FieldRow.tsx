'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldRowProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  help?: string;
  /**
   * Pre-rendered icon element, e.g. `<Mail size={13} />`.
   * Caller controls size/stroke; the wrapper provides colour + layout.
   */
  icon?: ReactNode;
  multi?: boolean;
  rows?: number;
  error?: string;
}

export function FieldRow({
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  help,
  icon,
  multi = false,
  rows = 3,
  error,
}: FieldRowProps) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-paper-text-2 dark:text-ink-text-2 mb-1.5">
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md border',
          'bg-paper-surface dark:bg-ink-surface',
          error
            ? 'border-red-500 dark:border-red-600'
            : 'border-paper-border dark:border-ink-border',
          'focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-0 focus-within:border-gold',
          multi && 'items-start py-2.5',
        )}
      >
        {icon && (
          <span
            className={cn(
              'shrink-0 flex items-center text-paper-text-3 dark:text-ink-text-3',
              multi && 'mt-0.5',
            )}
          >
            {icon}
          </span>
        )}
        {multi ? (
          <textarea
            rows={rows}
            value={value}
            defaultValue={defaultValue}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[13px] leading-relaxed outline-none resize-none text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3"
          />
        ) : (
          <input
            value={value}
            defaultValue={defaultValue}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[13px] outline-none text-paper-text-1 dark:text-ink-text-1 placeholder:text-paper-text-3 dark:placeholder:text-ink-text-3"
          />
        )}
      </div>
      {help && !error && (
        <p className="mt-1.5 text-[11.5px] text-paper-text-3 dark:text-ink-text-3">{help}</p>
      )}
      {error && <p className="mt-1.5 text-[11.5px] text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
