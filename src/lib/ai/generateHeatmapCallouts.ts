import { getOpenAI, OPENAI_MODEL } from './openai';
import { createServiceRoleClient } from './serviceRoleClient';
import type { HeatmapSummary } from '@/lib/analytics/computeHeatmap';
import { heatmapDayName, formatHourRange } from '@/lib/analytics/computeHeatmap';

const SYSTEM_PROMPT = `You are an operations analyst for a small Irish service business. Given a weekly booking-density heatmap, produce exactly TWO one-line callouts: one "raise prices / add capacity" recommendation on a near-fully-booked slot, one "run a flash sale" recommendation on an under-used but open slot.

RULES:
- Each callout: under 140 characters.
- Reference the specific day + hour range.
- Be concrete. No hedging.
- Never say "AI", "algorithm", or "data".

OUTPUT FORMAT: JSON — {"raise": "string", "flash": "string"}.`;

export type HeatmapCallouts = { raise: string; flash: string };

export async function generateHeatmapCallouts(
  businessId: string,
  summary: HeatmapSummary,
): Promise<HeatmapCallouts | null> {
  if (!summary.peakDayHour || !summary.quietDayHour) return null;

  const compact = {
    peak: {
      day: heatmapDayName(summary.peakDayHour.day),
      hours: formatHourRange(summary.peakDayHour.hour),
      utilisation: Math.round(summary.peakDayHour.utilisation * 100),
      avgBookings: summary.peakDayHour.bookings,
    },
    quiet: {
      day: heatmapDayName(summary.quietDayHour.day),
      hours: formatHourRange(summary.quietDayHour.hour),
      utilisation: Math.round(summary.quietDayHour.utilisation * 100),
      avgBookings: summary.quietDayHour.bookings,
    },
    topFive: summary.topUtilisation.slice(0, 5).map((c) => ({
      day: heatmapDayName(c.day),
      hours: formatHourRange(c.hour),
      utilisation: Math.round(c.utilisation * 100),
    })),
    bottomFive: summary.bottomUtilisation.slice(0, 5).map((c) => ({
      day: heatmapDayName(c.day),
      hours: formatHourRange(c.hour),
      utilisation: Math.round(c.utilisation * 100),
    })),
  };

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(compact) },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';
  try {
    const parsed = JSON.parse(raw) as HeatmapCallouts;
    if (!parsed.raise || !parsed.flash) return null;

    const supabase = createServiceRoleClient();
    await supabase.from('ai_insights').insert([
      {
        business_id: businessId,
        insight_type: 'heatmap_callout',
        headline: 'Raise prices or add capacity',
        body: parsed.raise,
        data_snapshot: compact.peak as unknown as Record<string, unknown>,
        model: OPENAI_MODEL,
      },
      {
        business_id: businessId,
        insight_type: 'heatmap_callout',
        headline: 'Run a flash sale',
        body: parsed.flash,
        data_snapshot: compact.quiet as unknown as Record<string, unknown>,
        model: OPENAI_MODEL,
      },
    ]);

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fallback deterministic callouts when no AI insight has been generated yet.
 * The UI uses these on day 1 so the page is never empty.
 */
export function fallbackHeatmapCallouts(summary: HeatmapSummary): HeatmapCallouts {
  const peak = summary.peakDayHour;
  const quiet = summary.quietDayHour;

  const raise = peak
    ? `${heatmapDayName(peak.day)} ${formatHourRange(peak.hour)} runs at ${Math.round(peak.utilisation * 100)}% utilisation — raise prices or add capacity.`
    : 'Not enough peak data yet to suggest a price rise.';

  const flash = quiet
    ? `${heatmapDayName(quiet.day)} ${formatHourRange(quiet.hour)} sits at ${Math.round(quiet.utilisation * 100)}% — run a flash sale here.`
    : 'No soft slots to target for a flash sale yet.';

  return { raise, flash };
}
