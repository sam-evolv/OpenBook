'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISuggestionChipsProps {
  conversationId: string;
  /**
   * Id of the most recent INBOUND message in the thread. Drives the
   * cache key on the server and is the signal the client uses to
   * decide whether to refetch. Null when the conversation has no
   * inbound messages yet — chips hide in that case.
   */
  lastInboundId: string | null;
  /** ISO timestamp of the last inbound message. Used for 24h freshness. */
  lastInboundAt: string | null;
  /** Direction of the last message in the thread. Chips hide when outbound. */
  lastMessageDirection: 'inbound' | 'outbound' | null;
  /**
   * Whether the composer currently has a non-empty draft. When true,
   * the chips do NOT refetch on new-inbound — replacing them under
   * the user's cursor is hostile. Chips set by the initial fetch on
   * thread open still render.
   */
  isComposing: boolean;
  onPick: (text: string) => void;
}

const STALE_MS = 24 * 60 * 60 * 1_000;

/**
 * Inline AI reply suggestions above the Composer textarea.
 *
 * Auto-fetches once per (conversation, last-inbound) pair; any
 * failure (401, 404, timeout, bad JSON, network) results in no chips
 * rendered. The endpoint itself is idempotent and cached server-side
 * for 60s so a tab-refocus or poll doesn't churn OpenAI calls.
 *
 * A 200–300ms opacity fade-in makes chips feel thought-up rather
 * than popping in. Driven by a data attribute the first render paints
 * at opacity-0, then a microtask flips it to opacity-100.
 */
export function AISuggestionChips({
  conversationId,
  lastInboundId,
  lastInboundAt,
  lastMessageDirection,
  isComposing,
  onPick,
}: AISuggestionChipsProps) {
  const [chips, setChips] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  // We read isComposing via ref inside the effect so that draft
  // changes don't invalidate the deps — the effect should only fire
  // when the (conversation, last-inbound) key actually changes.
  const isComposingRef = useRef(isComposing);
  isComposingRef.current = isComposing;

  const prevConvIdRef = useRef<string | null>(null);

  const isStale =
    !lastInboundAt ||
    Date.now() - new Date(lastInboundAt).getTime() > STALE_MS;

  const shouldShow =
    !!lastInboundId &&
    lastMessageDirection === 'inbound' &&
    !isStale;

  useEffect(() => {
    const isConvChange = prevConvIdRef.current !== conversationId;
    prevConvIdRef.current = conversationId;

    if (!shouldShow) {
      setChips([]);
      setVisible(false);
      return;
    }

    // Mid-compose: preserve the chips we already have; skip refetch.
    // On conversation change this branch is never taken because
    // Thread.tsx resets the draft to '' on id change.
    if (!isConvChange && isComposingRef.current) {
      return;
    }

    let cancelled = false;
    setVisible(false);
    setChips([]);

    (async () => {
      try {
        const res = await fetch('/api/ai/suggest-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { chips?: unknown };
        if (cancelled) return;
        if (Array.isArray(data.chips)) {
          const cleaned = data.chips
            .filter((c): c is string => typeof c === 'string')
            .slice(0, 3);
          if (cleaned.length > 0) {
            setChips(cleaned);
            // Flip visibility after layout so the opacity transition
            // actually animates (rather than committing 0→1 in one frame).
            requestAnimationFrame(() => {
              if (!cancelled) setVisible(true);
            });
          }
        }
      } catch {
        // Network/parse failure: no chips, silent.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, lastInboundId, shouldShow]);

  if (!shouldShow || chips.length === 0) return null;

  return (
    <div
      className={cn(
        'mb-2.5 flex flex-wrap items-center gap-1.5 transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3">
        <Sparkles size={11} className="text-gold" />
        Suggest
      </span>
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="group text-left rounded-full border border-paper-border dark:border-ink-border bg-paper-surface dark:bg-ink-surface px-2.5 py-1 text-[11.5px] leading-snug text-paper-text-2 dark:text-ink-text-2 hover:bg-gold-soft hover:border-gold-border hover:text-paper-text-1 dark:hover:text-ink-text-1 transition-colors max-w-[280px] truncate"
          title={chip}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
