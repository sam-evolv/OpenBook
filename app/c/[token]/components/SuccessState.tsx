'use client';

import { useState, type CSSProperties } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { pickContextualLine } from '@/lib/checkout/contextual-lines';
import { categoryIconFor } from '@/lib/checkout/category-icons';
import { downloadIcs } from '@/lib/checkout/calendar-export';

type Props = {
  bookingId: string;
  startIso: string;
  endIso: string;
  serviceName: string;
  customerName: string | null;
  category: string | null;
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
};

function firstNameOf(full: string | null): string | null {
  if (!full) return null;
  const trimmed = full.trim().split(/\s+/)[0];
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function pickHeadline(startIso: string, firstName: string | null): string {
  const startMs = new Date(startIso).getTime();
  const nowMs = Date.now();
  const diffMs = startMs - nowMs;
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  const trailing = firstName ? `, ${firstName}` : '';
  if (diffMs > oneDay) return `Booking confirmed${trailing}.`;
  if (diffMs > oneHour) return `You're set${trailing}.`;
  return `All set${trailing}.`;
}

const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '14px 16px',
  borderRadius: 10,
  background: 'var(--ob-co-surface-elev)',
  border: '1px solid var(--ob-co-border-quiet)',
  color: 'var(--ob-co-text-1)',
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontWeight: 500,
  fontSize: 15,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'border-color 200ms var(--ob-co-ease-out)',
};

export default function SuccessState({
  bookingId,
  startIso,
  endIso,
  serviceName,
  customerName,
  category,
  businessName,
  businessAddress,
  businessPhone,
}: Props) {
  const firstName = firstNameOf(customerName);
  const headline = pickHeadline(startIso, firstName);
  const contextualLine = pickContextualLine(bookingId, category);
  const Icon = categoryIconFor(category);

  const reference = `OB-${bookingId.slice(0, 8).toUpperCase()}`;
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail in iframes / insecure contexts. Silent — the
      // reference is plainly visible above the icon either way.
    }
  };

  const onAddToCalendar = () => {
    downloadIcs({
      uid: bookingId,
      title: `${serviceName} — ${businessName}`,
      startIso,
      endIso,
      location: businessAddress ?? businessName,
      description: 'Booked via OpenBook',
    });
  };

  const directionsHref = businessAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(`${businessName} ${businessAddress}`)}`
    : null;
  const messageHref = businessPhone ? `tel:${businessPhone.replace(/\s+/g, '')}` : null;

  return (
    <section
      className="ob-co-success-enter"
      style={{
        maxWidth: 520,
        margin: '0 auto',
        textAlign: 'center',
        display: 'grid',
        gap: 24,
      }}
    >
      <div className="ob-co-success-mark" aria-hidden style={markStyle}>
        <Check size={26} color="#FFFFFF" strokeWidth={2.5} aria-hidden />
      </div>

      <h1
        suppressHydrationWarning
        style={{
          margin: 0,
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontWeight: 600,
          fontSize: 'clamp(28px, 6vw, 32px)',
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          color: 'var(--ob-co-text-1)',
        }}
      >
        {headline}
      </h1>

      <p
        style={{
          margin: 0,
          marginTop: -12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 16,
          color: 'var(--ob-co-text-2)',
        }}
      >
        <Icon size={18} color="var(--ob-co-gold)" aria-hidden />
        <span>{contextualLine}</span>
      </p>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={onCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
            fontWeight: 400,
            fontSize: 12,
            color: 'var(--ob-co-text-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-label={copied ? 'Reference copied' : 'Copy booking reference'}
        >
          <span>Reference · {reference}</span>
          {copied ? (
            <span style={{ color: 'var(--ob-co-gold)' }}>Copied.</span>
          ) : (
            <Copy size={14} aria-hidden />
          )}
        </button>
      </div>

      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
        className="ob-co-success-actions"
      >
        <button type="button" onClick={onAddToCalendar} style={buttonStyle}>
          <Calendar size={16} color="var(--ob-co-gold)" aria-hidden />
          <span>Add to Calendar</span>
        </button>
        {directionsHref ? (
          <a href={directionsHref} target="_blank" rel="noreferrer" style={buttonStyle}>
            <MapPin size={16} color="var(--ob-co-gold)" aria-hidden />
            <span>Get Directions</span>
          </a>
        ) : null}
        {messageHref ? (
          <a href={messageHref} style={buttonStyle}>
            <MessageCircle size={16} color="var(--ob-co-gold)" aria-hidden />
            <span>Message {businessName}</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

const markStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 28,
  background: 'var(--ob-co-gold)',
  display: 'grid',
  placeItems: 'center',
  margin: '0 auto',
};
