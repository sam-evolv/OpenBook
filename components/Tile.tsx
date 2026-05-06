'use client';

import { useRef, useState, useCallback, useEffect, type CSSProperties } from 'react';
import {
  getTileColour,
  tileGradient,
  tileTextColour,
  type TileColourSlug,
} from '@/lib/tile-palette';
import { haptics } from '@/lib/haptics';

export interface TileProps {
  /** Display name — used for label and monogram fallback. */
  name: string;
  /** Canonical palette slug. Falls back to default if invalid. */
  colour: TileColourSlug | string | null | undefined;
  /** Pre-processed monochrome white logo URL. Optional. */
  logoUrl?: string | null;
  /** Tile size in CSS pixels. Default 64. */
  size?: number;
  /** Status indicator dot. */
  status?: 'open' | 'opens-soon' | 'closed';
  /** Tap handler — receives bounding rect for view-transition use. */
  onTap?: (rect: DOMRect) => void;
  /** Long-press handler — used for peek preview. */
  onLongPress?: (rect: DOMRect) => void;
  /** Hide the label below the tile (used in headers, peek). */
  hideLabel?: boolean;
  /** Stagger delay (ms) for grid load animation. */
  animationDelay?: number;
  /** View-transition name for shared-element transitions. */
  viewTransitionName?: string;
}

const LONG_PRESS_MS = 380;
const PRESS_MOVE_TOLERANCE = 8;

export function Tile({
  name,
  colour,
  logoUrl,
  size = 64,
  status,
  onTap,
  onLongPress,
  hideLabel = false,
  animationDelay = 0,
  viewTransitionName,
}: TileProps) {
  const tileColour = getTileColour(colour);
  const monogram = name.trim().charAt(0).toUpperCase() || '?';

  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = useState(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    longPressFired.current = false;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    setPressed(true);
    haptics.tap();
    if (onLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        haptics.longPress();
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) onLongPress(rect);
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pressOrigin.current) return;
    const dx = Math.abs(e.clientX - pressOrigin.current.x);
    const dy = Math.abs(e.clientY - pressOrigin.current.y);
    if (dx > PRESS_MOVE_TOLERANCE || dy > PRESS_MOVE_TOLERANCE) {
      clearLongPress();
      setPressed(false);
    }
  };

  const handlePointerUp = () => {
    clearLongPress();
    setPressed(false);
    if (longPressFired.current) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect && onTap) onTap(rect);
  };

  const handlePointerCancel = () => {
    clearLongPress();
    setPressed(false);
  };

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const textColour = tileTextColour(tileColour);
  const dropShadowColour =
    textColour === '#ffffff' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.18)';
  const monogramFontSize = Math.round(size * 0.46);
  const logoSize = Math.round(size * 0.6);
  const radius = Math.round(size * 0.25);

  const buttonStyle: CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    borderRadius: radius,
    padding: 0,
    border: 'none',
    background: tileGradient(tileColour),
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.28), inset 0 0 0 0.5px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.4)',
    cursor: 'pointer',
    transform: pressed ? 'scale(0.94)' : 'scale(1)',
    transition: 'transform 180ms cubic-bezier(0.2, 0.9, 0.3, 1)',
    overflow: 'hidden',
    animation: animationDelay
      ? `ob-tile-in 420ms cubic-bezier(0.2, 0.9, 0.3, 1) both`
      : undefined,
    animationDelay: animationDelay ? `${animationDelay}ms` : undefined,
    viewTransitionName: viewTransitionName,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  };

  return (
    <div
      className="ob-tile-wrap"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Open ${name}`}
        className="ob-tile"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        style={buttonStyle}
      >
        {/* Grain overlay — adds the "this is glass, not flat CSS" texture. */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            opacity: 0.35,
            mixBlendMode: 'overlay',
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            backgroundSize: '80px 80px',
            pointerEvents: 'none',
          }}
        />

        {/* Centre content: logo or monogram. */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt=""
              width={logoSize}
              height={logoSize}
              style={{
                width: logoSize,
                height: logoSize,
                objectFit: 'contain',
                filter: `drop-shadow(0 1px 2px ${dropShadowColour})`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              draggable={false}
            />
          ) : (
            <span
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: monogramFontSize,
                fontWeight: 500,
                lineHeight: 1,
                color: textColour,
                letterSpacing: '-0.02em',
                textShadow: `0 1px 2px ${dropShadowColour}`,
              }}
            >
              {monogram}
            </span>
          )}
        </span>

        {/* Status indicator dot, top-right. */}
        {status && status !== 'open' && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background:
                status === 'closed'
                  ? 'rgba(255,255,255,0.55)'
                  : '#F59E0B',
              boxShadow:
                '0 0 0 1.5px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4)',
            }}
          />
        )}
      </button>

      {!hideLabel && (
        <span
          style={{
            // 11px keeps things compact; the wider maxWidth and CSS-only
            // ellipsis let names like "Evolv Performance" land on
            // "Evolv Perform…" instead of the cramped "Evolv Perfo…".
            fontSize: 11,
            color: 'var(--ob-text-1, rgba(255,255,255,0.9))',
            fontWeight: 500,
            maxWidth: size + 28,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </span>
      )}

      <style jsx>{`
        @keyframes ob-tile-in {
          0%   { opacity: 0; transform: scale(0.86) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
