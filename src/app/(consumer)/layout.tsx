import type { ReactNode } from 'react';
import FloatingDock from '@/components/consumer/FloatingDock';

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FloatingDock />
    </>
  );
}
