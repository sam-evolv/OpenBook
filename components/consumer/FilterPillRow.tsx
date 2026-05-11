/**
 * FilterPillRow — horizontal scrolling pill row (category, when, etc.).
 *
 * - 36px tall, fully-rounded, snap on scroll.
 * - Active pill: solid gold-on-black (matches existing Explore active pill).
 * - Inactive: subtle dark fill with hairline border.
 */

'use client';

type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
};

export function FilterPillRow<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="overflow-x-auto no-scrollbar -mx-5 px-5"
    >
      <div className="flex items-center gap-2 snap-x snap-mandatory">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              className={`
                shrink-0 snap-start h-9 px-4 rounded-full
                text-[13.5px] font-medium tracking-tight
                transition active:scale-95
                ${
                  active
                    ? 'bg-[#D4AF37] text-black border border-[#D4AF37]'
                    : 'bg-white/[0.03] text-white/70 border border-white/[0.08] hover:border-white/20'
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
