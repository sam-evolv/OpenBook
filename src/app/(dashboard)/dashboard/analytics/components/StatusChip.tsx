import type { HealthStatus } from '@/lib/analytics/computeHealthScore';

const MAP: Record<HealthStatus, { bg: string; ring: string; fg: string }> = {
  Thriving: {
    bg: 'rgba(212,175,55,0.15)',
    ring: 'rgba(212,175,55,0.45)',
    fg: '#D4AF37',
  },
  Steady: {
    bg: 'rgba(255,255,255,0.04)',
    ring: 'rgba(255,255,255,0.14)',
    fg: 'rgba(240,240,240,0.8)',
  },
  Cooling: {
    bg: 'rgba(248,168,64,0.12)',
    ring: 'rgba(248,168,64,0.35)',
    fg: '#f8a840',
  },
  'At Risk': {
    bg: 'rgba(255,79,66,0.12)',
    ring: 'rgba(255,79,66,0.45)',
    fg: '#ff6f65',
  },
  Lost: {
    bg: 'rgba(255,255,255,0.02)',
    ring: 'rgba(255,255,255,0.06)',
    fg: 'rgba(240,240,240,0.35)',
  },
};

export function StatusChip({ status }: { status: HealthStatus }) {
  const tone = MAP[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-mono tracking-[0.1em] uppercase"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.ring}`,
        color: tone.fg,
      }}
    >
      {status}
    </span>
  );
}
