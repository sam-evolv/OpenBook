'use client';

/**
 * PaymentModePicker — two-up segmented control for "Pay now" vs
 * "Pay in person". Lifted state; parent (ConfirmSpotButton) is the source
 * of truth so the CTA copy can stay in sync.
 *
 * Render gating lives in the parent: shown only for paid sales on
 * Stripe-onboarded businesses.
 */

export type PaymentMode = 'stripe_now' | 'in_person';

type Props = {
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
};

const OPTIONS: ReadonlyArray<{
  value: PaymentMode;
  label: string;
  caption: string;
}> = [
  { value: 'stripe_now', label: 'Pay now', caption: 'Secure with card' },
  { value: 'in_person', label: 'Pay in person', caption: 'Pay when you arrive' },
];

export function PaymentModePicker({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Payment method"
      className="grid grid-cols-2 gap-3"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex h-[56px] items-center gap-3 rounded-xl border px-4 text-left transition active:scale-[0.98] ${
              selected
                ? 'border-[#D4AF37] bg-[#D4AF37]/[0.06]'
                : 'border-white/10 bg-[#0E0E0E]'
            }`}
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selected ? 'border-[#D4AF37]' : 'border-zinc-500'
              }`}
            >
              {selected && (
                <span className="block h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
              )}
            </span>
            <span className="flex flex-col leading-tight">
              <span
                className={`text-[14px] font-medium ${
                  selected ? 'text-white' : 'text-zinc-200'
                }`}
              >
                {option.label}
              </span>
              <span className="text-[11px] text-zinc-500">
                {option.caption}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
