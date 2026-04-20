'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

type Props = {
  headline: string;
  body: string;
  date: string;
};

export function AIInsightCard({ headline, body, date }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = `${headline}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  const dateLabel = new Date(date).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border-l-4 border-brand-500 border-t border-r border-b border-line bg-[#0f1115] p-6 shadow-premium transition-transform duration-300 ease-premium hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gold-100 border border-gold-300">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
            Weekly insight
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy insight to clipboard"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-paper/60 hover:text-paper hover:border-gold-400 transition-colors duration-200 ease-premium"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-gold" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <h3 className="mt-3 font-display text-[18px] text-paper leading-tight tracking-tight">
        {headline}
      </h3>
      <p className="mt-2 text-[14.5px] leading-[1.55] text-paper/80">{body}</p>
      <div className="mt-4 font-mono text-[10.5px] tracking-[0.18em] uppercase text-paper/40">
        {dateLabel}
      </div>
    </div>
  );
}
