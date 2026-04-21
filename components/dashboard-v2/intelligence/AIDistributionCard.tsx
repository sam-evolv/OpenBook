import { Sparkles } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';

/**
 * Placeholder for Phase 4 — bookings from ChatGPT / Claude / Gemini
 * landing via the ai_queries table (fed by the MCP server at
 * mcp.openbook.ie). Rendered with the same shape as the populated
 * version so the USP reads visually from day one; stats show em-dashes
 * and the endpoint is named explicitly.
 */
export function AIDistributionCard() {
  return (
    <Card variant="gold" padding="none">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8934C 100%)',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)',
            }}
          >
            <Sparkles size={15} className="text-black" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-semibold text-paper-text-1 dark:text-ink-text-1">
              AI distribution
            </div>
            <div className="mt-0.5 text-[12px] text-paper-text-3 dark:text-ink-text-3">
              Bookings from ChatGPT, Claude, Gemini — via{' '}
              <code className="font-mono text-[11.5px] text-gold">mcp.openbook.ie</code>
            </div>
          </div>
          <Button variant="secondary" size="sm" disabled title="MCP ships in Phase 4">
            MCP settings
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: 'AI queries this month', value: '—' },
            { label: 'AI-driven bookings', value: '—' },
            { label: 'Top question', value: '—', mono: true },
            { label: 'Top source', value: '—' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[10.5px] font-medium uppercase tracking-[0.3px] text-paper-text-3 dark:text-ink-text-3">
                {s.label}
              </div>
              <div
                className="mt-1.5 text-[22px] font-semibold tabular-nums tracking-tight text-paper-text-3 dark:text-ink-text-3"
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-gold-border bg-gold-soft px-3 py-2 text-[11.5px] text-paper-text-2 dark:text-ink-text-2 leading-relaxed">
          <span className="font-semibold text-gold">Phase 4 · Messages.</span> When the MCP server
          at <code className="font-mono text-[11px]">mcp.openbook.ie</code> starts writing to the
          <code className="font-mono text-[11px] mx-1">ai_queries</code>table, these numbers fill
          in automatically.
        </div>
      </div>
    </Card>
  );
}
