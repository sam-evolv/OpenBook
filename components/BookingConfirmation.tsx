'use client';

import { useEffect, type ReactNode } from 'react';
import { haptics } from '@/lib/haptics';

/**
 * The booking confirmation moment.
 *
 * Sequence (total ~1.4s):
 *   0ms    — gold circle scales in from 0
 *   220ms  — checkmark stroke draws (400ms)
 *   320ms  — haptic success pulse
 *   700ms  — title fades in
 *   900ms  — subtitle fades in
 *   1100ms — action buttons fade in + slide up
 */

export interface BookingConfirmationAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface BookingConfirmationProps {
  title: string;
  subtitle: string;
  actions?: BookingConfirmationAction[];
  children?: ReactNode;
}

export function BookingConfirmation({
  title,
  subtitle,
  actions = [],
  children,
}: BookingConfirmationProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => haptics.success(), 320);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        background: '#080808',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <CheckMark />
      </div>

      <h1
        style={{
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'rgba(255,255,255,0.98)',
          margin: '0 0 10px',
          opacity: 0,
          animation: 'ob-fade-up 420ms cubic-bezier(0.2, 0.9, 0.3, 1) 700ms forwards',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: 15,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.6)',
          margin: 0,
          maxWidth: 300,
          opacity: 0,
          animation: 'ob-fade-up 420ms cubic-bezier(0.2, 0.9, 0.3, 1) 900ms forwards',
        }}
      >
        {subtitle}
      </p>

      {children && (
        <div
          style={{
            marginTop: 24,
            width: '100%',
            maxWidth: 360,
            opacity: 0,
            animation: 'ob-fade-up 420ms cubic-bezier(0.2, 0.9, 0.3, 1) 1000ms forwards',
          }}
        >
          {children}
        </div>
      )}

      {actions.length > 0 && (
        <div
          style={{
            marginTop: 40,
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            opacity: 0,
            animation: 'ob-fade-up 420ms cubic-bezier(0.2, 0.9, 0.3, 1) 1100ms forwards',
          }}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                haptics.tap();
                action.onClick();
              }}
              style={{
                width: '100%',
                padding: '16px 22px',
                borderRadius: 14,
                border: action.primary ? 'none' : '0.5px solid rgba(255,255,255,0.14)',
                background: action.primary ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                color: action.primary ? '#080808' : 'rgba(255,255,255,0.92)',
                fontSize: 16,
                fontWeight: action.primary ? 600 : 500,
                letterSpacing: '-0.01em',
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
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes ob-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function CheckMark() {
  return (
    <div
      style={{
        position: 'relative',
        width: 104,
        height: 104,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #E8C968 0%, #D4AF37 55%, #A88828 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.22), 0 8px 28px rgba(212,175,55,0.32)',
          transform: 'scale(0)',
          animation: 'ob-ring-pop 520ms cubic-bezier(0.2, 0.9, 0.3, 1) 60ms forwards',
        }}
      />
      <svg
        width="104"
        height="104"
        viewBox="0 0 104 104"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        <polyline
          points="32,54 46,68 74,38"
          fill="none"
          stroke="#080808"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: 80,
            animation:
              'ob-check-draw 400ms cubic-bezier(0.5, 0, 0.2, 1) 220ms forwards',
          }}
        />
      </svg>

      <style jsx>{`
        @keyframes ob-ring-pop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes ob-check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
