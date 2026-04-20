'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
import { AIInsightCard } from './AIInsightCard';
import type { AIInsight } from '@/lib/analytics/types';

type Props = {
  insights: AIInsight[];
};

export function AIInsightLog({ insights }: Props) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return insights;
    return insights.filter(
      (i) =>
        i.headline.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q),
    );
  }, [insights, query]);

  return (
    <section className="rounded-2xl border border-line bg-[#0f1115] shadow-premium overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-gold">
              Insight log
            </span>
          </div>
          <h2 className="mt-2 font-display text-[22px] text-paper leading-tight tracking-tight">
            Your business, written up each week.
          </h2>
          <p className="mt-1 text-[12.5px] text-paper/55 max-w-xl">
            Every Monday at 08:00, we write you one unexpected observation. Old
            entries stay searchable here.
          </p>
        </div>
        <label className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-white/[0.02] px-3 py-2 w-[260px]">
          <Search className="h-3.5 w-3.5 text-paper/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search insights"
            className="bg-transparent outline-none text-[12.5px] text-paper placeholder:text-paper/30 w-full"
          />
        </label>
      </header>

      <div className="p-6">
        {insights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-center">
            <p className="text-[13.5px] text-paper/70">
              Your first weekly insight lands next Monday.
            </p>
            <p className="mt-1 text-[12px] text-paper/45">
              The log fills up here over the following weeks — a little diary of
              your business, written for you.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-paper/60">
            No insights match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((i) => (
              <AIInsightCard
                key={i.id}
                headline={i.headline}
                body={i.body}
                date={i.generated_at}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
