/**
 * UrgencyBadge — top-right marker on an OpenSpotCard.
 *
 * Tier 1 (within 4h): pulsing gold dot + "Just opened".
 * Tier 2 (within 24h): small filled gold pill "Limited".
 * Tier 3 (default):    nothing rendered.
 *
 * No red. No emoji. Scarcity through space + weight only.
 */

type Props = { tier: 1 | 2 | 3 };

export function UrgencyBadge({ tier }: Props) {
  if (tier === 3) return null;

  if (tier === 1) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="block h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse-dot"
        />
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#D4AF37]">
          Just opened
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{ backgroundColor: '#D4AF3722', color: '#8B6428' }}
    >
      Limited
    </span>
  );
}
