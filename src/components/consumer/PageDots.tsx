type Props = {
  count: number;
  active: number;
};

export default function PageDots({ count, active }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        padding: '8px 0',
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const isActive = i === active;
        return (
          <span
            key={i}
            style={{
              width: isActive ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: isActive ? '#D4AF37' : 'rgba(255,255,255,0.18)',
              transition: 'all 200ms ease',
            }}
          />
        );
      })}
    </div>
  );
}
