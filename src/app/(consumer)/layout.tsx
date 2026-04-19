import type { ReactNode } from 'react';
import FloatingDock from '@/components/consumer/FloatingDock';
import { FRAME_MAX_WIDTH, colors } from '@/lib/constants';

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: colors.bg,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: FRAME_MAX_WIDTH,
          minHeight: '100dvh',
          position: 'relative',
          overflow: 'hidden',
          background: colors.bg,
        }}
      >
        <div
          style={{
            minHeight: '100dvh',
            paddingBottom: 110,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
        <FloatingDock />
      </div>
    </div>
  );
}
