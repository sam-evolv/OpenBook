'use client';

import type { ReactNode } from 'react';
import { haptics } from '@/lib/haptics';

/**
 * Empty state — for Bookings, Wallet, Messages, anywhere a list can be
 * empty. The goal is a moment of personality, not an apology.
 *
 * Principles:
 *   - Icon is a custom SVG in gold, not a generic stock icon.
 *   - Title is a complete sentence (not "No bookings").
 *   - Description sets the expectation ("Your bookings will live here.").
 *   - Optional action button for the "so how do I get started?" answer.
 */

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 32px',
        minHeight: 400,
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      <div
        style={{
          marginBottom: 24,
          opacity: 0.9,
          animation: 'ob-empty-float 4200ms ease-in-out infinite',
        }}
      >
        {icon}
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: 'rgba(255,255,255,0.95)',
          margin: '0 0 10px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
          maxWidth: 280,
        }}
      >
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            action.onClick();
          }}
          style={{
            marginTop: 28,
            padding: '12px 24px',
            borderRadius: 12,
            border: '0.5px solid rgba(212,175,55,0.5)',
            background: 'rgba(212,175,55,0.1)',
            color: '#D4AF37',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 160ms ease, background 160ms ease',
          }}
          onPointerDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onPointerUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {action.label}
        </button>
      )}

      <style jsx>{`
        @keyframes ob-empty-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: '1px solid rgba(212,175,55,0.35)',
        background:
          'radial-gradient(circle at 30% 30%, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#D4AF37',
      }}
    >
      {children}
    </div>
  );
}

export function CalendarEmptyIcon() {
  return (
    <IconFrame>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 3v4M16 3v4" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" />
      </svg>
    </IconFrame>
  );
}

export function WalletEmptyIcon() {
  return (
    <IconFrame>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="14" rx="2.5" />
        <path d="M3 10h18" />
        <circle cx="17" cy="15" r="1.4" fill="currentColor" />
      </svg>
    </IconFrame>
  );
}

export function MessagesEmptyIcon() {
  return (
    <IconFrame>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </IconFrame>
  );
}

export function CompassEmptyIcon() {
  return (
    <IconFrame>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5,8.5 10,10 8.5,15.5 14,14" fill="currentColor" fillOpacity="0.18" />
      </svg>
    </IconFrame>
  );
}

export function HeartEmptyIcon() {
  return (
    <IconFrame>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 8.4a5 5 0 0 0-8.5-3.5 5 5 0 0 0-8.5 3.5c0 6 8.5 11 8.5 11s8.5-5 8.5-11z" />
      </svg>
    </IconFrame>
  );
}
