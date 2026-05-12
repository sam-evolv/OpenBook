/**
 * PriceBlock — centred sale-price stack for the confirm screen.
 *
 *   €30                ← 52px Geist sans, gold
 *   €̶5̶0̶ usually      ← 14px Geist, zinc-500, strikethrough on the price
 *   You save €20 (40% off) ← 13px Geist, gold weight 500
 *
 * Prices use Geist sans for scannability (matches Stripe / Booking / Airbnb
 * convention); Fraunces serif is reserved for business names + section
 * headers. Free sales (sale_price_cents === 0) render "Free" instead of
 * the savings line. Pure server component.
 */

import { formatEUR } from '@/lib/money';

type Props = {
  salePriceCents: number;
  originalPriceCents: number;
  discountPercent: number;
};

export function PriceBlock({
  salePriceCents,
  originalPriceCents,
  discountPercent,
}: Props) {
  const isFree = salePriceCents <= 0;
  const savings = Math.max(0, originalPriceCents - salePriceCents);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="font-sans text-[52px] font-semibold leading-none tracking-tight text-[#D4AF37]">
        {isFree ? 'Free' : formatEUR(salePriceCents)}
      </span>

      {originalPriceCents > 0 && (
        <span className="text-[14px] text-zinc-500">
          <span className="line-through">{formatEUR(originalPriceCents)}</span>{' '}
          usually
        </span>
      )}

      {!isFree && savings > 0 && (
        <span className="text-[13px] font-medium text-[#D4AF37]">
          You save {formatEUR(savings)} ({discountPercent}% off)
        </span>
      )}
    </div>
  );
}
