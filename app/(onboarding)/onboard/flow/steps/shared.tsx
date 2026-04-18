'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function StepHeader({ eyebrow, title, subtitle }: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="animate-reveal-up">
      <p className="text-caption-eyebrow mb-3" style={{ color: 'var(--brand-gold)' }}>
        {eyebrow}
      </p>
      <h1 className="text-display leading-[0.98]" style={{ fontSize: '34px' }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-[16px] leading-[1.45] max-w-[480px]" style={{ color: 'var(--label-2)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="block text-[12px] font-semibold tracking-wide uppercase mb-2"
        style={{ color: 'var(--label-3)', letterSpacing: '0.08em' }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="block mt-1.5 text-[12px]" style={{ color: 'var(--label-3)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  type?: string;
}) {
  return (
    <input
      autoFocus={autoFocus}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-[52px] w-full rounded-2xl px-5 text-[16px] mat-card outline-none focus:ring-2 placeholder:text-white/35 transition-all"
      style={{ color: 'var(--label-1)' }}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-2xl px-5 py-4 text-[15px] mat-card outline-none focus:ring-2 placeholder:text-white/35 resize-none leading-relaxed transition-all"
      style={{ color: 'var(--label-1)' }}
    />
  );
}

export function NextButton({
  onClick,
  disabled,
  loading,
  label = 'Continue',
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-[56px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-all"
      style={{
        background: 'linear-gradient(145deg, #F6D77C 0%, #D4AF37 50%, #8B6428 100%)',
        boxShadow: '0 10px 24px rgba(212, 175, 55, 0.3)',
        transitionTimingFunction: 'var(--ease-apple)',
      }}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </>
      )}
    </button>
  );
}

export function SkipLink({ onClick, label = 'Skip for now' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 h-12 w-full rounded-full text-[13px] font-medium hover:bg-white/5 transition-colors"
      style={{ color: 'var(--label-3)' }}
    >
      {label}
    </button>
  );
}
