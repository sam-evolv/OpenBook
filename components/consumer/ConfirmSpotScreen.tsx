/**
 * ConfirmSpotScreen — server-rendered body of /open-spots/[saleId]/confirm.
 *
 * Stacks the back nav, hero, price block, slot card, capacity indicator,
 * and the client-island CTA group. Money lives in cents until the edge,
 * times are Dublin-local, no emoji, gold is the only accent.
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { CapacityIndicator } from './CapacityIndicator';
import { ConfirmSpotButton } from './ConfirmSpotButton';
import { PriceBlock } from './PriceBlock';
import { SlotCard } from './SlotCard';

export type ConfirmSpotData = {
  saleId: string;
  businessName: string;
  businessSlug: string;
  businessCity: string | null;
  businessPrimaryColour: string | null;
  businessLogoUrl: string | null;
  businessCoverImageUrl: string | null;
  stripeChargesEnabled: boolean;
  serviceName: string;
  durationMinutes: number;
  slotTimeIso: string;
  originalPriceCents: number;
  salePriceCents: number;
  discountPercent: number;
  maxBookings: number;
  bookingsTaken: number;
};

export function ConfirmSpotScreen({ data }: { data: ConfirmSpotData }) {
  const isFree = data.salePriceCents <= 0;
  const primaryColour = data.businessPrimaryColour || '#D4AF37';
  const initials = data.businessName.slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[480px] px-6 pb-[88px] md:pb-12">
      <div className="flex h-11 items-center pt-2">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-[14px] text-zinc-500"
        >
          <ArrowLeft className="h-[16px] w-[16px]" aria-hidden />
          Open Spots
        </Link>
      </div>

      <div className="relative mt-2 h-[180px] overflow-hidden rounded-2xl">
        {data.businessCoverImageUrl ? (
          <>
            <Image
              src={data.businessCoverImageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 480px) 480px, 100vw"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(8,8,8,0.6) 100%)',
              }}
            />
          </>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(180deg, ${primaryColour}29 0%, transparent 100%)`,
            }}
          >
            {data.businessLogoUrl ? (
              <Image
                src={data.businessLogoUrl}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-2xl object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl font-serif text-[36px] font-medium text-white"
                style={{ backgroundColor: primaryColour }}
              >
                {initials}
              </span>
            )}
          </div>
        )}
      </div>

      <h1 className="mt-6 truncate font-serif text-[26px] font-medium leading-tight tracking-tight text-white">
        {data.businessName}
      </h1>
      <p className="mt-1 text-[14px] font-medium text-zinc-400">
        {data.serviceName} · {data.durationMinutes} min
      </p>

      <div className="mt-8">
        <PriceBlock
          salePriceCents={data.salePriceCents}
          originalPriceCents={data.originalPriceCents}
          discountPercent={data.discountPercent}
        />
      </div>

      <div className="mt-6">
        <SlotCard
          slotTimeIso={data.slotTimeIso}
          durationMinutes={data.durationMinutes}
          businessName={data.businessName}
          city={data.businessCity}
        />
      </div>

      <div className="mt-4">
        <CapacityIndicator
          maxBookings={data.maxBookings}
          bookingsTaken={data.bookingsTaken}
        />
      </div>

      <div className="mt-8">
        <ConfirmSpotButton
          saleId={data.saleId}
          salePriceCents={data.salePriceCents}
          isFree={isFree}
          stripeEnabled={data.stripeChargesEnabled}
          businessSlug={data.businessSlug}
        />
      </div>

      <p className="mt-4 px-2 text-center text-[11px] text-zinc-500 md:mb-0">
        Booking holds your spot. Free cancellation up to 2 hours before.
      </p>
    </div>
  );
}
