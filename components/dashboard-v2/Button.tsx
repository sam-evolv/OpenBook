'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /**
   * Pre-rendered icon element, e.g. `<Plus size={14} />`.
   * Caller controls icon size/stroke so the prop is serialisable
   * across the RSC boundary (a plain React element, not a component ref).
   */
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  lg: 'h-10 px-4 text-sm gap-2 rounded-lg',
};

const variantClasses: Record<Variant, string> = {
  primary: cn(
    'bg-gold text-black border border-gold-muted font-medium',
    'hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.3)]',
    'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper-bg dark:focus-visible:ring-offset-ink-bg',
  ),
  secondary: cn(
    'bg-paper-surface text-paper-text-1 border border-paper-borderStrong font-medium',
    'dark:bg-ink-surface dark:text-ink-text-1 dark:border-ink-borderStrong',
    'hover:bg-paper-surface2 dark:hover:bg-ink-surface2',
    'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
  ),
  ghost: cn(
    'bg-transparent text-paper-text-2 border border-transparent font-medium',
    'dark:text-ink-text-2',
    'hover:bg-paper-surface hover:text-paper-text-1',
    'dark:hover:bg-ink-surface dark:hover:text-ink-text-1',
    'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
  ),
  danger: cn(
    'bg-red-50 text-red-600 border border-red-500 font-medium',
    'dark:bg-red-950/20 dark:text-red-400 dark:border-red-900',
    'hover:bg-red-100 dark:hover:bg-red-950/30',
    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
  ),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconPosition = 'left', children, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center transition-all select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        'active:scale-[0.98]',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
});
