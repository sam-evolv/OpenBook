import type { ReactNode } from 'react';
import { SystemAppIcon } from '@/components/consumer/SystemAppIcon';

const TILE_SIZE = 72;
const COLUMN_GAP = 16;

const SYSTEM_TILES = [
  { kind: 'discover' as const, key: 'discover' },
  { kind: 'wallet' as const, key: 'wallet' },
  { kind: 'me' as const, key: 'me' },
  { kind: 'assistant' as const, key: 'assistant' },
];

export function HomeSystemTilesRow() {
  return (
    <div
      className="mx-auto"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(4, ${TILE_SIZE}px)`,
        columnGap: COLUMN_GAP,
        width: 'max-content',
        maxWidth: '100%',
        justifyContent: 'center',
      }}
    >
      {SYSTEM_TILES.map(({ kind, key }) => (
        <GridSlot key={key}>
          <SystemAppIcon kind={kind} size={TILE_SIZE} />
        </GridSlot>
      ))}
    </div>
  );
}

function GridSlot({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>;
}
