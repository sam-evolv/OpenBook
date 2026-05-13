'use client';

import { useEffect, useRef } from 'react';
import { Tile } from './Tile';
import { haptics } from '@/lib/haptics';
import type { TileColourSlug } from '@/lib/tile-palette';

/**
 * TilePeekAction is a discriminated union: an `action` row fires a single
 * callback and dismisses the menu; a `toggle` row renders an iOS-style
 * switch, fires `onChange` on tap of the whole row, and does NOT dismiss.
 *
 * `kind` defaults to 'action' so existing call sites continue to work
 * without modification.
 */
export type TilePeekAction = TilePeekActionItem | TilePeekToggleItem;

export interface TilePeekActionItem {
  kind?: 'action';
  label: string;
  icon?: React.ReactNode;
  /** Right-edge affordance — typically a chevron to signal "opens another sheet". */
  trailingIcon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface TilePeekToggleItem {
  kind: 'toggle';
  label: string;
  icon?: React.ReactNode;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export interface TilePeekProps {
  /** Anchor rect from the tile that triggered the peek. */
  anchorRect: DOMRect;
  /** Business identity. */
  name: string;
  colour: TileColourSlug | string | null | undefined;
  logoUrl?: string | null;
  logoIsProcessedIcon?: boolean;
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
  logoIsProcessedIcon = false,
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
          logoIsProcessedIcon={logoIsProcessedIcon}
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
          {actions.map((action, i) =>
            action.kind === 'toggle' ? (
              <ToggleRow
                key={action.label}
                action={action}
                isFirst={i === 0}
              />
            ) : (
              <ActionRow
                key={action.label}
                action={action}
                isFirst={i === 0}
                onSelect={() => {
                  if (action.disabled) return;
                  haptics.tap();
                  action.onSelect();
                  onClose();
                }}
              />
            ),
          )}
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

function ActionRow({
  action,
  isFirst,
  onSelect,
}: {
  action: TilePeekActionItem;
  isFirst: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={action.disabled}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '14px 18px',
        background: 'transparent',
        border: 'none',
        borderTop: isFirst ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
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
      {action.trailingIcon && (
        <span
          aria-hidden
          style={{
            width: 14,
            height: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.4,
          }}
        >
          {action.trailingIcon}
        </span>
      )}
    </button>
  );
}

function ToggleRow({
  action,
  isFirst,
}: {
  action: TilePeekToggleItem;
  isFirst: boolean;
}) {
  // Full-row hit target: tapping anywhere on the row fires onChange.
  // The switch on the right is purely visual — its own click handler stops
  // propagation but defers to the same callback, so screen readers also
  // see a single coherent control.
  const handleToggle = () => {
    if (action.disabled) return;
    haptics.tap();
    action.onChange(!action.value);
  };

  return (
    <div
      role="switch"
      aria-checked={action.value}
      aria-disabled={action.disabled}
      tabIndex={action.disabled ? -1 : 0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleToggle();
        }
      }}
      style={{
        width: '100%',
        padding: '14px 18px',
        background: 'transparent',
        borderTop: isFirst ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
        color: action.disabled
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
      <span
        aria-hidden
        style={{
          width: 51,
          height: 31,
          borderRadius: 15.5,
          padding: 2,
          background: action.value ? '#D4AF37' : 'rgba(120,120,128,0.32)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: action.value ? 'flex-end' : 'flex-start',
          transition: 'background 220ms var(--ease-apple)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 27,
            height: 27,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow:
              '0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06)',
            transition: 'transform 220ms var(--ease-apple)',
          }}
        />
      </span>
    </div>
  );
}
