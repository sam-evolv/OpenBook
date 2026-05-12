'use client';

import { usePathname } from 'next/navigation';
import { BottomTabBar } from '@/components/consumer/BottomTabBar';
import { usePushNotifications } from '@/lib/push-client';

export function ConsumerLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  // Boot native push registration once per session. No-op on web.
  usePushNotifications();

  /* Hide the home dock on business app routes and anywhere that has its own nav */
  const hideDock =
    pathname.startsWith('/business/') ||
    pathname.startsWith('/booking/') ||
    pathname.startsWith('/open-spots/');

  return (
    <>
      {children}
      {!hideDock && <BottomTabBar />}
    </>
  );
}
