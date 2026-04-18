import type { FC } from 'react';

export const HouseSymbol: FC = () => (
  <g fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.92}>
    <path d="M15 29 L31 16 L47 29 L47 46 L37 46 L37 35 L25 35 L25 46 L15 46 Z" />
  </g>
);

export const CompassSymbol: FC = () => (
  <g>
    <circle cx={31} cy={31} r={16} fill="none" stroke="#fff" strokeWidth={2} opacity={0.9} />
    <path d="M31 19 L34 31 L31 43 L28 31 Z" fill="#D4AF37" opacity={0.95} />
    <circle cx={31} cy={31} r={1.6} fill="#fff" />
  </g>
);

export const SparkleSymbol: FC = () => (
  <g fill="#fff">
    <path
      d="M31 12 L33.2 25.5 L46 28 L33.2 30.5 L31 44 L28.8 30.5 L16 28 L28.8 25.5 Z"
      opacity={0.98}
    />
    <circle cx={45} cy={17} r={2} opacity={0.85} />
    <circle cx={17} cy={45} r={1.6} opacity={0.75} />
  </g>
);

export const CalendarSymbol: FC = () => (
  <g fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.95}>
    <rect x={14} y={18} width={34} height={30} rx={4} />
    <path d="M14 27 L48 27" />
    <path d="M22 14 L22 22" />
    <path d="M40 14 L40 22" />
  </g>
);

export const ProfileSymbol: FC = () => (
  <g fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.92}>
    <circle cx={31} cy={24} r={7} />
    <path d="M17 47 C17 39 24 35 31 35 C38 35 45 39 45 47" />
  </g>
);
