'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Plus } from 'lucide-react';
import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { QuietSuggestions } from './QuietSuggestions';
import { SaleCard } from './SaleCard';
import { CreateFlashSaleDrawer } from './CreateFlashSaleDrawer';
import type {
  FlashSalesPayload,
  FlashSaleRow,
  QuietSuggestion,
  TargetAudience,
} from '@/lib/dashboard-v2/flash-sales-queries';

interface FlashSalesClientProps {
  payload: FlashSalesPayload;
  businessName: string;
}

export function FlashSalesClient({ payload, businessName }: FlashSalesClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefillSlot, setPrefillSlot] = useState<QuietSuggestion | null>(null);
  // Audience is tracked on the drawer and on a per-sale basis for
  // publish. Drafts don't persist their audience (no column), so the
  // owner picks it again at Publish time via the card's default.
  const [publishAudience] = useState<TargetAudience>('favourites');

  function openCreate(prefill: QuietSuggestion | null = null) {
    setPrefillSlot(prefill);
    setDrawerOpen(true);
  }

  function refresh() {
    router.refresh();
  }

  const drafts = payload.sales.filter((s) => s.ui_state === 'draft');
  const upcoming = payload.sales.filter((s) => s.ui_state === 'upcoming');
  const past = payload.sales.filter((s) => s.ui_state === 'past');

  const noSales = payload.sales.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-8 py-6 space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-paper-text-1 dark:text-ink-text-1">
            Flash sales
          </h1>
          <p className="text-[13px] text-paper-text-2 dark:text-ink-text-2 mt-0.5">
            Fill quiet slots for {businessName}. Nothing sends until Stage 2.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => openCreate(null)}
        >
          Create flash sale
        </Button>
      </header>

      <StageBanner
        optedInCount={payload.optedInCount}
        totalCustomerCount={payload.totalCustomerCount}
      />

      <QuietSuggestions
        suggestions={payload.suggestions}
        onPick={(s) => openCreate(s)}
      />

      {noSales ? (
        <EmptyState
          icon={Zap}
          title="No flash sales yet"
          description="Create a draft from scratch, or pick a quiet window above. In Stage 1 you can design and preview sales — WhatsApp delivery turns on in Stage 2."
          action={
            <Button
              variant="secondary"
              size="md"
              icon={<Plus size={14} />}
              onClick={() => openCreate(null)}
            >
              Create flash sale
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <SaleGroup
            title="Drafts"
            sales={drafts}
            audience={publishAudience}
            onChanged={refresh}
          />
          <SaleGroup
            title="Upcoming"
            sales={upcoming}
            audience={publishAudience}
            onChanged={refresh}
          />
          <SaleGroup
            title="Past"
            sales={past}
            audience={publishAudience}
            onChanged={refresh}
          />
        </div>
      )}

      <CreateFlashSaleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        services={payload.services}
        audienceCounts={payload.audienceCounts}
        optedInCount={payload.optedInCount}
        totalCustomerCount={payload.totalCustomerCount}
        prefillSlot={prefillSlot}
        onCreated={refresh}
      />
    </div>
  );
}

function StageBanner({
  optedInCount,
  totalCustomerCount,
}: {
  optedInCount: number;
  totalCustomerCount: number;
}) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-amber-800 dark:text-amber-300">
          Stage 1 · dry run
        </span>
      </div>
      <p className="text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-200">
        <span className="font-semibold">
          Will send to 0 of {totalCustomerCount} customers.
        </span>{' '}
        {optedInCount} {optedInCount === 1 ? 'person is' : 'people are'}{' '}
        opted-in for promotional WhatsApp messages. Opt-ins arrive in Stage 2
        via WhatsApp YES replies and owner invites. Until then, publishing a
        sale materialises a permanent ledger of intent but sends nothing.
      </p>
    </div>
  );
}

function SaleGroup({
  title,
  sales,
  audience,
  onChanged,
}: {
  title: string;
  sales: FlashSaleRow[];
  audience: TargetAudience;
  onChanged: () => void;
}) {
  if (sales.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.4px] text-paper-text-3 dark:text-ink-text-3">
          {title}
        </h2>
        <span className="text-[11px] tabular-nums text-paper-text-3 dark:text-ink-text-3">
          · {sales.length}
        </span>
      </div>
      <div className="space-y-2">
        {sales.map((s) => (
          <SaleCard key={s.id} sale={s} audience={audience} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
