import { TrendingUp, Zap } from 'lucide-react';

type Props = {
  callouts: { raise: string; flash: string };
  hasEnoughData: boolean;
};

export function HeatmapCallouts({ callouts, hasEnoughData }: Props) {
  if (!hasEnoughData) {
    return (
      <div className="px-6 py-5 border-t border-line bg-[#0b0d12]">
        <p className="text-[12.5px] text-paper/50">
          Heatmap callouts land here once you have ~2 weeks of bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-line bg-[#0b0d12]">
      <Callout
        icon={<TrendingUp className="h-4 w-4" />}
        label="Raise prices or add capacity"
        body={callouts.raise}
      />
      <div className="border-t md:border-t-0 md:border-l border-line" />
      <Callout
        icon={<Zap className="h-4 w-4" />}
        label="Run a flash sale"
        body={callouts.flash}
      />
    </div>
  );
}

function Callout({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div className="px-6 py-5 flex items-start gap-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold-100 border border-gold-300 text-gold shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-paper/45">
          {label}
        </div>
        <p className="mt-1 text-[14px] leading-[1.55] text-paper/90">{body}</p>
      </div>
    </div>
  );
}
