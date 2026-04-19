'use client';

import { usePathname } from 'next/navigation';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';

export function ConsumerLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  /* Hide the home dock on business app routes and anywhere that has its own nav */
  const hideDock =
    pathname.startsWith('/business/') ||
    pathname.startsWith('/booking/');

  return (
    <>
      {children}
      {!hideDock && <BottomTabBar />}
    </>
  );
}
