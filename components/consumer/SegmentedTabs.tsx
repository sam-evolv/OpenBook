/**
 * SegmentedTabs — three-way control sitting below the page title.
 *
 *   [ Discover ]  [ Open Spots ]  [ Favourites ]
 *
 * - 44px tall, full-width, 1px hairline divider underneath.
 * - Active: black text (light mode) / white text (dark mode) on gold
 *   2px underline, no fill.
 * - Inactive: zinc-500.
 */

'use client';

export type TabId = 'discover' | 'open-spots' | 'favourites';

type Props = {
  value: TabId;
  onChange: (next: TabId) => void;
};

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'discover', label: 'Discover' },
  { id: 'open-spots', label: 'Open Spots' },
  { id: 'favourites', label: 'Favourites' },
];

export function SegmentedTabs({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Explore sections"
      className="relative border-b border-white/[0.08]"
    >
      <div className="grid grid-cols-3">
        {TABS.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={`
                relative h-11 inline-flex items-center justify-center
                text-[14px] font-medium tracking-tight
                transition-colors
                ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}
              `}
            >
              {t.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute bottom-[-1px] left-1/4 right-1/4 h-[2px] bg-[#D4AF37] rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
