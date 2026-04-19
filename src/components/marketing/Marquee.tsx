const CATEGORIES = [
  'Gyms',
  'Barbers',
  'Salons',
  'Physios',
  'Nail studios',
  'Yoga studios',
  'Sauna & spa',
  'Driving schools',
  'Personal training',
  'Pilates',
  'Aesthetics',
  'Tattoo',
  'Dog grooming',
  'Dentists',
  'Massage',
  'Osteopaths',
];

export function Marquee() {
  const row = (
    <ul className="flex shrink-0 items-center gap-10 pr-10">
      {CATEGORIES.map((c, i) => (
        <li key={i} className="flex items-center gap-10">
          <span className="font-display italic text-[26px] md:text-[32px] text-paper/65 whitespace-nowrap">
            {c}
          </span>
          <span aria-hidden className="text-gold/80 text-[14px]">
            ✳
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Categories we serve"
      className="relative py-10 md:py-14 border-y border-white/[0.04] bg-ink"
    >
      <div className="marquee-mask overflow-hidden">
        <div className="marquee">
          {row}
          {row}
        </div>
      </div>
    </section>
  );
}
