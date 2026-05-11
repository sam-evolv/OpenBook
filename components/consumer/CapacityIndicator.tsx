/**
 * CapacityIndicator — pill showing how many spots remain on a flash sale.
 *
 *   ●○○  3 spots remaining     ← gold filled / unfilled circles
 *   ●    Last spot              ← single gold dot when only one is left
 *
 * Renders nothing for `max_bookings === 1` (singles communicate scarcity
 * through urgency, not through capacity).
 */

type Props = {
  maxBookings: number;
  bookingsTaken: number;
};

export function CapacityIndicator({ maxBookings, bookingsTaken }: Props) {
  if (maxBookings <= 1) return null;

  const remaining = Math.max(0, maxBookings - bookingsTaken);
  const isLastSpot = remaining === 1;
  const label = isLastSpot ? 'Last spot' : `${remaining} spots remaining`;

  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37]/[0.08] px-3 py-1.5">
        <span aria-hidden className="inline-flex items-center gap-1">
          {Array.from({ length: remaining }).map((_, i) => (
            <span
              key={`filled-${i}`}
              className="block h-[10px] w-[10px] rounded-full bg-[#D4AF37]"
            />
          ))}
          {!isLastSpot &&
            Array.from({ length: bookingsTaken }).map((_, i) => (
              <span
                key={`empty-${i}`}
                className="block h-[10px] w-[10px] rounded-full border border-[#D4AF37]"
              />
            ))}
        </span>
        <span className="font-serif text-[16px] font-medium text-[#D4AF37]">
          {label}
        </span>
      </div>
    </div>
  );
}
