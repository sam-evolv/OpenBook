'use client';

import type { CSSProperties } from 'react';
import { categoryIconFor } from '@/lib/checkout/category-icons';
import { LiquidGlassIcon } from './LiquidGlassIcon';
import { OpenBookMark } from './OpenBookMark';

export interface ShareableConfirmationCardProps {
  businessName: string;
  businessSlug: string;
  businessCategory?: string | null;
  businessLogoUrl?: string | null;
  businessProcessedIconUrl?: string | null;
  /** Hex like '#D4AF37' — already resolved from the palette slug. */
  primaryColourHex: string;
  serviceName: string;
  /** Pre-formatted, e.g. "Friday, 16 May · 7:30 PM". */
  dateTimeLabel: string;
  /** Compact (recap-card) variant — half the height, smaller type. */
  compact?: boolean;
  style?: CSSProperties;
}

const GOLD = '#D4AF37';
const CARD_BG = '#080808';

export function ShareableConfirmationCard({
  businessName,
  businessSlug,
  businessCategory,
  businessLogoUrl,
  businessProcessedIconUrl,
  primaryColourHex,
  serviceName,
  dateTimeLabel,
  compact = false,
  style,
}: ShareableConfirmationCardProps) {
  const Icon = categoryIconFor(businessCategory);
  const initials = businessName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const logo = businessProcessedIconUrl ?? businessLogoUrl ?? null;

  // The header band is full-bleed and fades into pure black using a
  // radial gradient from the business primary colour. Stops are tuned
  // so the colour reads as a soft ambient wash rather than a saturated
  // patch — the photo on Instagram Stories sits on a black background
  // and we want a smooth blend.
  const bandHeight = compact ? '20vh' : '32vh';
  const headerBackground = `
    radial-gradient(140% 80% at 50% 0%, ${primaryColourHex}66 0%, ${primaryColourHex}22 35%, ${CARD_BG} 75%),
    ${CARD_BG}
  `;

  const logoSize = compact ? 56 : 96;
  const serviceFontSize = compact ? 22 : 34;
  const dateTimeFontSize = compact ? 14 : 22;
  const iconSize = compact ? 20 : 28;

  return (
    <div
      data-shareable-card
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: CARD_BG,
        color: '#ffffff',
        overflow: 'hidden',
        borderRadius: compact ? 22 : 0,
        // Roughly 9:16 — the screenshot zone. On a 390px iPhone this
        // resolves to ~693px tall, which fits within the visible
        // viewport once browser chrome is cropped out.
        aspectRatio: compact ? 'auto' : '9 / 16',
        width: '100%',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: bandHeight,
          background: headerBackground,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: compact ? '24px 20px 22px' : `calc(${bandHeight} - ${logoSize / 2}px) 24px 0`,
          flex: 1,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: compact ? 14 : 24 }}>
          {logo ? (
            <div
              style={{
                width: logoSize,
                height: logoSize,
                borderRadius: Math.round(logoSize * 0.28),
                overflow: 'hidden',
                background: '#1a1a1a',
                boxShadow: '0 6px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={businessName}
                width={logoSize}
                height={logoSize}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <LiquidGlassIcon
              primaryColour={primaryColourHex}
              fallbackInitials={initials}
              size={logoSize}
            />
          )}
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontWeight: 500,
            fontSize: serviceFontSize,
            letterSpacing: '-0.02em',
            color: GOLD,
            lineHeight: 1.1,
            maxWidth: 340,
          }}
        >
          {serviceName}
        </h1>

        <p
          style={{
            margin: compact ? '6px 0 0' : '14px 0 0',
            fontSize: dateTimeFontSize,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {dateTimeLabel}
        </p>

        {!compact && (
          <div
            style={{
              margin: '32px 0',
              color: GOLD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={iconSize} strokeWidth={1.6} />
          </div>
        )}

        <div style={{ flex: 1 }} />

        <p
          style={{
            margin: 0,
            fontSize: compact ? 13 : 16,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '-0.005em',
          }}
        >
          {businessName}
        </p>

        <p
          style={{
            margin: '6px 0 0',
            fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: compact ? 11 : 13,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.01em',
          }}
        >
          openbook.ie/{businessSlug}
        </p>

        {!compact && (
          <p
            style={{
              margin: '32px 0 40px',
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontStyle: 'italic',
              fontSize: 17,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '-0.005em',
            }}
          >
            See you there.
          </p>
        )}
      </div>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: compact ? 14 : 18,
          bottom: compact ? 12 : 18,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: GOLD,
          opacity: 0.5,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        <OpenBookMark size={11} strokeWidth={1.8} />
        <span>OPENBOOK</span>
      </div>
    </div>
  );
}
