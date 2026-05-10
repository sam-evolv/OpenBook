'use client';

import { useState, type CSSProperties, type InputHTMLAttributes } from 'react';

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ob-co-text-2)',
  display: 'block',
  marginBottom: 6,
};

const baseInputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  background: 'var(--ob-co-surface-elev)',
  border: '1px solid var(--ob-co-border-quiet)',
  borderRadius: 8,
  padding: '16px',
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontSize: 16,
  fontWeight: 400,
  color: 'var(--ob-co-text-1)',
  outline: 'none',
  transition: 'border-color 200ms var(--ob-co-ease-out)',
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  onBlur?: () => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>;

export function Field({ label, value, onChange, error, onBlur, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColour = error
    ? 'var(--ob-co-danger)'
    : focused
      ? 'var(--ob-co-gold)'
      : 'var(--ob-co-border-quiet)';
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        style={{ ...baseInputStyle, borderColor: borderColour }}
      />
      {error ? (
        <span
          style={{
            fontSize: 12,
            color: 'var(--ob-co-danger)',
            marginTop: 6,
            display: 'block',
          }}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...baseInputStyle,
          resize: 'vertical',
          minHeight: 88,
          borderColor: focused ? 'var(--ob-co-gold)' : 'var(--ob-co-border-quiet)',
        }}
      />
    </label>
  );
}

// Phone is optional. If empty on first render, show a low-noise ghost
// button instead of a full input. Tap expands it. Once expanded (or if
// pre-filled) it behaves as a normal field.
export function PhoneField({
  value,
  onChange,
  initiallyVisible,
}: {
  value: string;
  onChange: (v: string) => void;
  initiallyVisible: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyVisible);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          padding: '8px 0',
          color: 'var(--ob-co-text-3)',
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontSize: 14,
          fontWeight: 400,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        + Add phone number
      </button>
    );
  }

  return (
    <Field
      label="Phone (optional)"
      type="tel"
      autoComplete="tel"
      inputMode="tel"
      value={value}
      onChange={onChange}
      autoFocus={!initiallyVisible}
    />
  );
}
