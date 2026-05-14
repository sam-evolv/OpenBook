'use client';

import { useRouter } from 'next/navigation';
import { EmptyState, WalletEmptyIcon } from '@/components/EmptyState';

export function WalletEmptyState() {
  const router = useRouter();
  return (
    <EmptyState
      icon={<WalletEmptyIcon />}
      title="Your wallet's ready when you are"
      description="Credits and packages you buy from your favourite businesses show up here. Use them like cash."
      action={{
        label: 'Browse businesses',
        onClick: () => router.push('/explore'),
      }}
    />
  );
}
