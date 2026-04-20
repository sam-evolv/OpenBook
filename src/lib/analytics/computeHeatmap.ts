import type { AnalyticsBooking, BusinessHour } from './types';

export type HeatmapCell = {
  day: number; // 0 = Sunday
  hour: number; // 0..23
  bookings: number;
  capacity: number; // slots available when open, else 0
  utilisation: number; // 0..1
  revenueCents: number;
};

export type HeatmapSummary = {
  cells: HeatmapCell[]; // 168
  topUtilisation: HeatmapCell[]; // sorted desc
  bottomUtilisation: HeatmapCell[]; // open slots with low utilisation
  peakDayHour: HeatmapCell | null;
  quietDayHour: HeatmapCell | null;
  maxBookings: number;
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function heatmapDayName(d: number): string {
  return DAY_NAMES[d] ?? '';
}

export function formatHourRange(hour: number): string {
  const start = hour % 24;
  const end = (hour + 1) % 24;
  const fmt = (h: number) =>
    h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  return `${fmt(start)}–${fmt(end)}`;
}

function parseHour(time: string | null): number | null {
  if (!time) return null;
  const [h] = time.split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return null;
  return hour;
}

export function computeHeatmap(
  bookings: AnalyticsBooking[],
  businessHours: BusinessHour[],
  assumedCapacityPerHour = 3,
): HeatmapSummary {
  // sum of counts over the last 90 days ~ rolling weekly average
  const counts = new Uint16Array(7 * 24);
  const revenue = new Float64Array(7 * 24);

  const confirmed = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed',
  );

  for (const b of confirmed) {
    const d = new Date(b.start_at);
    const idx = d.getDay() * 24 + d.getHours();
    counts[idx] += 1;
    revenue[idx] += b.price_cents ?? 0;
  }

  // weeks of history (to normalise to weekly average)
  const weeksOfHistory = Math.max(1, 90 / 7);

  const hoursByDay = new Map<number, { opens: number; closes: number }>();
  for (const h of businessHours) {
    const opens = parseHour(h.opens_at);
    const closes = parseHour(h.closes_at);
    if (opens === null || closes === null) continue;
    hoursByDay.set(h.day_of_week, { opens, closes });
  }

  // fallback to a gentle 8am-8pm if no hours configured
  const fallback = { opens: 8, closes: 20 };

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    const hours = hoursByDay.get(day) ?? fallback;
    for (let hour = 0; hour < 24; hour++) {
      const idx = day * 24 + hour;
      const avgBookings = counts[idx] / weeksOfHistory;
      const isOpen = hour >= hours.opens && hour < hours.closes;
      const capacity = isOpen ? assumedCapacityPerHour : 0;
      const utilisation = capacity === 0 ? 0 : Math.min(1, avgBookings / capacity);
      cells.push({
        day,
        hour,
        bookings: Math.round(avgBookings * 10) / 10,
        capacity,
        utilisation,
        revenueCents: Math.round(revenue[idx] / weeksOfHistory),
      });
    }
  }

  const openCells = cells.filter((c) => c.capacity > 0);
  const topUtilisation = [...openCells]
    .sort((a, b) => b.utilisation - a.utilisation)
    .slice(0, 5);
  const bottomUtilisation = [...openCells]
    .filter((c) => c.bookings > 0)
    .sort((a, b) => a.utilisation - b.utilisation)
    .slice(0, 5);

  const peakDayHour = topUtilisation[0] ?? null;
  const quietDayHour = bottomUtilisation[0] ?? null;

  const maxBookings = cells.reduce((m, c) => Math.max(m, c.bookings), 0);

  return {
    cells,
    topUtilisation,
    bottomUtilisation,
    peakDayHour,
    quietDayHour,
    maxBookings,
  };
}
