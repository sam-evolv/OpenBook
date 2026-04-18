type Props = {
  active: number;
  total: number;
};

export default function PageDots({ active, total }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 108,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === active;
        return (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: isActive
                ? 'rgba(255,255,255,0.95)'
                : 'rgba(255,255,255,0.3)',
            }}
          />
        );
      })}
    </div>
  );
}
