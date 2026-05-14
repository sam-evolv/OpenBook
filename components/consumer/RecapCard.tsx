'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { ShareableConfirmationCard } from './ShareableConfirmationCard';
import { haptics } from '@/lib/haptics';

export interface RecapCardProps {
  bookingId: string;
  serviceId: string;
  businessName: string;
  businessSlug: string;
  businessCategory: string | null;
  businessLogoUrl: string | null;
  businessProcessedIconUrl: string | null;
  primaryColourHex: string;
  serviceName: string;
  /** Pre-formatted compact label, e.g. "Last Friday". */
  visitedLabel: string;
}

export function RecapCard({
  bookingId,
  serviceId,
  businessName,
  businessSlug,
  businessCategory,
  businessLogoUrl,
  businessProcessedIconUrl,
  primaryColourHex,
  serviceName,
  visitedLabel,
}: RecapCardProps) {
  const router = useRouter();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  return (
    <div
      data-recap-card={bookingId}
      style={{
        marginBottom: 24,
        padding: 12,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px 14px',
        }}
      >
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
          YOUR VISIT TO {businessName.toUpperCase()}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {visitedLabel}
        </span>
      </div>

      <ShareableConfirmationCard
        compact
        businessName={businessName}
        businessSlug={businessSlug}
        businessCategory={businessCategory}
        businessLogoUrl={businessLogoUrl}
        businessProcessedIconUrl={businessProcessedIconUrl}
        primaryColourHex={primaryColourHex}
        serviceName={serviceName}
        dateTimeLabel={visitedLabel}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 12,
        }}
      >
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setReviewModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 14px',
            borderRadius: 12,
            border: '0.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.92)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Star size={14} strokeWidth={2} />
          <span>Rate your visit</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            router.push(`/booking/${serviceId}`);
          }}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: 'none',
            background: '#D4AF37',
            color: '#080808',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Book again
        </button>
      </div>

      {reviewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setReviewModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 360,
              width: '100%',
              padding: '28px 24px',
              borderRadius: 20,
              background: '#0e0e10',
              border: '0.5px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              Reviews coming soon
            </h3>
            <p
              style={{
                margin: '10px 0 24px',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              We're building a clean way for you to leave ratings and notes. For now, your feedback can go to {businessName} directly.
            </p>
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.92)',
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
