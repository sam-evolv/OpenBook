'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Clock, X } from 'lucide-react';

export type AssistantSource = 'chatgpt' | 'claude' | 'gemini' | 'siri' | 'other' | null;

type Alternative = {
  start_iso: string;
  start_human: string;
  start_compact: string;
  rebook_url: string;
  service_name?: string;
  price_cents?: number | null;
};

const heroCircleStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 28,
  background: 'var(--ob-co-surface-elev)',
  display: 'grid',
  placeItems: 'center',
  margin: '0 auto',
};

const headlineStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontWeight: 600,
  fontSize: 24,
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
  color: 'var(--ob-co-text-1)',
  textAlign: 'center',
};

const subTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontWeight: 400,
  fontSize: 15,
  lineHeight: 1.5,
  color: 'var(--ob-co-text-2)',
  textAlign: 'center',
};

const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '14px 16px',
  borderRadius: 10,
  background: 'var(--ob-co-surface-elev)',
  border: '1px solid var(--ob-co-border-quiet)',
  color: 'var(--ob-co-text-1)',
  fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
  fontWeight: 500,
  fontSize: 15,
  textDecoration: 'none',
  transition: 'border-color 200ms var(--ob-co-ease-out)',
};

function assistantLabel(source: AssistantSource): string {
  switch (source) {
    case 'chatgpt': return 'ChatGPT';
    case 'claude': return 'Claude';
    case 'gemini': return 'Gemini';
    case 'siri': return 'Siri';
    default: return 'your assistant';
  }
}

function assistantHref(source: AssistantSource): string | null {
  switch (source) {
    case 'chatgpt': return 'https://chatgpt.com';
    case 'claude': return 'https://claude.ai';
    case 'gemini': return 'https://gemini.google.com';
    case 'siri': return null;
    default: return null;
  }
}

// ─── Expired-token state ───────────────────────────────────────────────

export function ExpiredState({ sourceAssistant }: { sourceAssistant: AssistantSource }) {
  const href = assistantHref(sourceAssistant);
  const label = assistantLabel(sourceAssistant);
  return (
    <section
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '48px 24px',
        display: 'grid',
        gap: 24,
        justifyItems: 'center',
      }}
    >
      <div aria-hidden style={heroCircleStyle}>
        <Clock size={24} color="var(--ob-co-text-3)" aria-hidden />
      </div>
      <h1 style={headlineStyle}>This booking link has expired.</h1>
      <p style={subTextStyle}>
        Booking links are held for 10 minutes. Tell your assistant if you&apos;d like to try a different time.
      </p>
      {href ? (
        <div style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
          <a href={href} target="_blank" rel="noreferrer" style={buttonStyle}>
            <ArrowUpRight size={16} color="var(--ob-co-gold)" aria-hidden />
            <span>Return to {label}</span>
          </a>
        </div>
      ) : null}
    </section>
  );
}

// ─── Slot-taken state (race condition during confirm) ──────────────────

function formatPrice(cents: number | null | undefined): { text: string; isFree: boolean } {
  if (cents == null) return { text: '', isFree: false };
  if (cents === 0) return { text: 'Free', isFree: true };
  return { text: `€${(cents / 100).toFixed(2).replace(/\.00$/, '')}`, isFree: false };
}

export function SlotTakenState({
  token,
  sourceAssistant,
}: {
  token: string;
  sourceAssistant: AssistantSource;
}) {
  const [alts, setAlts] = useState<Alternative[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/c/${token}/alternatives`)
      .then(async (res) => {
        if (!res.ok) throw new Error('alternatives_failed');
        const json = (await res.json()) as { alternatives: Alternative[] };
        if (!cancelled) setAlts(json.alternatives ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load alternative times.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onPick = async (alt: Alternative) => {
    if (pending) return;
    setPending(alt.start_iso);
    try {
      const res = await fetch(`/api/c/${token}/alternatives`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ start_iso: alt.start_iso }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok && typeof json.token === 'string') {
        window.location.href = `/c/${json.token}`;
        return;
      }
      if (typeof alt.rebook_url === 'string' && alt.rebook_url.length > 0) {
        window.location.href = alt.rebook_url;
        return;
      }
      setLoadError('Could not hold that time. Try another, or return to your assistant.');
    } catch {
      if (typeof alt.rebook_url === 'string' && alt.rebook_url.length > 0) {
        window.location.href = alt.rebook_url;
        return;
      }
      setLoadError('Network error — try another, or return to your assistant.');
    } finally {
      setPending(null);
    }
  };

  const href = assistantHref(sourceAssistant);
  const label = assistantLabel(sourceAssistant);

  return (
    <section
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '32px 24px',
        display: 'grid',
        gap: 24,
        justifyItems: 'center',
      }}
    >
      <div aria-hidden style={heroCircleStyle}>
        <X size={24} color="var(--ob-co-confirm-amber)" aria-hidden strokeWidth={2.5} />
      </div>
      <h1 style={headlineStyle}>Someone took this slot just before you.</h1>
      <p style={subTextStyle}>Three nearby times are still open.</p>

      <div style={{ width: '100%', display: 'grid', gap: 10 }}>
        {alts === null && !loadError ? (
          <>
            <div className="ob-co-skeleton" style={{ height: 56 }} />
            <div className="ob-co-skeleton" style={{ height: 56 }} />
            <div className="ob-co-skeleton" style={{ height: 56 }} />
          </>
        ) : null}
        {alts && alts.length > 0
          ? alts.map((alt) => {
              const price = formatPrice(alt.price_cents);
              const isPending = pending === alt.start_iso;
              return (
                <button
                  key={alt.start_iso}
                  type="button"
                  onClick={() => onPick(alt)}
                  disabled={Boolean(pending)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: 16,
                    borderRadius: 8,
                    background: 'var(--ob-co-surface)',
                    border: '1px solid var(--ob-co-border-quiet)',
                    color: 'var(--ob-co-text-1)',
                    fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
                    cursor: pending ? 'progress' : 'pointer',
                    textAlign: 'left',
                    opacity: pending && !isPending ? 0.5 : 1,
                    transition: 'opacity 150ms var(--ob-co-ease-out)',
                  }}
                >
                  <span style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>
                      {alt.service_name ?? alt.start_human}
                    </span>
                    <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--ob-co-text-2)' }}>
                      {alt.service_name ? alt.start_human : alt.start_compact}
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 14,
                      color: price.isFree ? 'var(--ob-co-gold)' : 'var(--ob-co-text-1)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {price.text}
                  </span>
                </button>
              );
            })
          : null}
        {alts && alts.length === 0 ? (
          <p style={{ ...subTextStyle, marginTop: 8 }}>
            No nearby times — tell your assistant for the full calendar.
          </p>
        ) : null}
        {loadError ? <p style={subTextStyle}>{loadError}</p> : null}
      </div>

      <div style={{ marginTop: 8 }}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontSize: 13,
              color: 'var(--ob-co-text-3)',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            None of these work? Return to {label}
          </a>
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
              fontSize: 13,
              color: 'var(--ob-co-text-3)',
            }}
          >
            None of these work? Return to your assistant.
          </span>
        )}
      </div>
    </section>
  );
}
