import type { FC } from 'react';

type PageDotsProps = {
  count?: number;
  active?: number;
};

const PageDots: FC<PageDotsProps> = ({ count = 3, active = 0 }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background:
            i === active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)',
        }}
      />
    ))}
  </div>
);

export default PageDots;
