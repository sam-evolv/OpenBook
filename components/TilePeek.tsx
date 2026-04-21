'use client';

import { useEffect, useRef } from 'react';
import { Tile } from './Tile';
import { haptics } from '@/lib/haptics';
import type { TileColourSlug } from '@/lib/tile-palette';

export interface TilePeekAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface TilePeekProps {
  /** Anchor rect from the tile that triggered the peek. */
  anchorRect: DOMRect;
  /** Business identity. */
  name: string;
  colour: TileColourSlug | string | null | undefined;
  logoUrl?: string | null;
  /** Subtitle line under the tile (e.g. next slot or category). */
  subtitle?: string;
  /** Quick-action menu items. */
  actions: TilePeekAction[];
  /** Called when the peek should close (backdrop tap, action tap, Esc). */
  onClose: () => void;
}

/**
 * Long-press peek preview. Spawns from the tile's anchor rect, dims the
 * background, and presents the tile enlarged with a vertical action menu.
 * Tap any action OR the backdrop OR press Esc to close.
 */
export function TilePeek({
  anchorRect,
  name,
  colour,
  logoUrl,
  subtitle,
  actions,
  onClose,
}: TilePeekProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const originX = anchorRect.left + anchorRect.width / 2;
  const originY = anchorRect.top + anchorRect.height / 2;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} quick actions`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        animation: 'ob-peek-fade 220ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          maxWidth: 320,
          width: '100%',
          transformOrigin: `${originX}px ${originY}px`,
          animation:
            'ob-peek-pop 320ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
        }}
      >
        <Tile
          name={name}
          colour={colour}
          logoUrl={logoUrl}
          size={128}
          hideLabel
        />

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'rgba(255,255,255,0.98)',
              marginBottom: subtitle ? 4 : 0,
            }}
          >
            {name}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          role="menu"
          style={{
            width: '100%',
            background: 'rgba(28,28,30,0.85)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            borderRadius: 14,
            border: '0.5px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          {actions.map((action, i) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                if (action.disabled) return;
                haptics.tap();
                action.onSelect();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'transparent',
                border: 'none',
                borderTop: i === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
                color: action.destructive
                  ? '#FF6B6B'
                  : action.disabled
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(255,255,255,0.95)',
                fontSize: 16,
                fontWeight: 400,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: action.disabled ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {action.icon && (
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.9,
                  }}
                >
                  {action.icon}
                </span>
              )}
              <span style={{ flex: 1 }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ob-peek-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ob-peek-pop {
          0%   { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
