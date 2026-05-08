'use client';

import type { CSSProperties } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export type AssistantSource = 'chatgpt' | 'claude' | 'gemini' | 'siri' | 'other' | null;

type Props = {
  sourceAssistant: AssistantSource;
};

type Variant = {
  copy: string;
  buttonLabel: string | null;
  buttonHref: string | null;
};

function variantFor(source: AssistantSource): Variant {
  switch (source) {
    case 'chatgpt':
      return {
        copy: 'Return to ChatGPT to ask about reminders, directions, or anything else for your visit.',
        buttonLabel: 'Open ChatGPT',
        buttonHref: 'https://chatgpt.com',
      };
    case 'claude':
      return {
        copy: 'Return to Claude to ask about reminders, directions, or anything else for your visit.',
        buttonLabel: 'Open Claude',
        buttonHref: 'https://claude.ai',
      };
    case 'gemini':
      return {
        copy: 'Return to Gemini to ask about reminders, directions, or anything else for your visit.',
        buttonLabel: 'Open Gemini',
        buttonHref: 'https://gemini.google.com',
      };
    case 'siri':
      return {
        copy: 'Return to Siri to ask about reminders, directions, or anything else for your visit.',
        buttonLabel: null,
        buttonHref: null,
      };
    default:
      return {
        copy: 'Return to your assistant to ask about reminders, directions, or anything else for your visit.',
        buttonLabel: null,
        buttonHref: null,
      };
  }
}

const cardStyle: CSSProperties = {
  background: 'var(--ob-co-surface)',
  border: '1px solid var(--ob-co-border-quiet)',
  borderRadius: 12,
  padding: 20,
  maxWidth: 520,
  margin: '0 auto',
  width: '100%',
};

// Visually distinct from but harmonious with the success-state's "Add to
// Calendar" / "Get Directions" buttons: same shape, but a muted-gold border
// and gold text mark it as the conversion CTA. Solid gold is reserved for
// the primary "Confirm Booking" CTA on the ready state.
const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 52,
  padding: '14px 16px',
  borderRadius: 14,
  background: 'var(--ob-co-surface-elev)',
  border: '1px solid var(--ob-co-gold-lo)',
  color: 'var(--ob-co-gold)',
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontWeight: 500,
  fontSize: 15,
  textDecoration: 'none',
  transition: 'border-color 200ms var(--ob-co-ease-out)',
};

// Bridge back to the assistant. Fades in 600ms after the success block has
// settled (see `.ob-co-bridge-enter` in app/globals.css).
export default function BridgeCard({ sourceAssistant }: Props) {
  const variant = variantFor(sourceAssistant);
  return (
    <aside className="ob-co-bridge-enter" style={cardStyle}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
        }}
      >
        <Sparkles size={14} color="var(--ob-co-gold)" aria-hidden />
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ob-co-text-2)' }}>
          Your assistant has the booking details.
        </span>
      </div>
      <p
        style={{
          margin: 0,
          marginTop: 8,
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontWeight: 400,
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--ob-co-text-2)',
        }}
      >
        {variant.copy}
      </p>
      {variant.buttonLabel && variant.buttonHref ? (
        <div style={{ marginTop: 16 }}>
          {/* Same-tab navigation: returning to the assistant should feel like
              a hand-off, not a new browser tab on top of OpenBook. */}
          <a
            href={variant.buttonHref}
            aria-label={`${variant.buttonLabel} to continue your conversation`}
            style={buttonStyle}
          >
            <ArrowUpRight size={16} color="var(--ob-co-gold)" aria-hidden />
            <span>{variant.buttonLabel}</span>
          </a>
        </div>
      ) : null}
    </aside>
  );
}
