'use client';

import type { FC } from 'react';

export const HomeSymbol: FC = () => (
  <path
    d="M12 30 L31 14 L50 30 L50 48 L38 48 L38 36 L24 36 L24 48 L12 48 Z"
    fill="#FFFFFF"
    fillOpacity="0.85"
  />
);

export const CompassSymbol: FC = () => (
  <g>
    <circle
      cx="31"
      cy="31"
      r="16"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.35"
      strokeWidth="1.2"
    />
    <path d="M37 23 L33 33 L23 37 L27 27 Z" fill="#D4AF37" />
    <path d="M37 23 L33 33 L29 32 Z" fill="#FFFFFF" fillOpacity="0.5" />
  </g>
);

export const SparkleSymbol: FC = () => (
  <g>
    <path
      d="M31 14 L34 26 L46 30 L34 34 L31 46 L28 34 L16 30 L28 26 Z"
      fill="#FFFFFF"
      fillOpacity="0.55"
    />
    <path
      d="M31 14 L34 26 L46 30 L35 31 L31 24 Z"
      fill="#FFFFFF"
      fillOpacity="0.35"
    />
    <circle cx="46" cy="15" r="1.5" fill="#FFFFFF" fillOpacity="0.9" />
    <circle cx="16" cy="46" r="1" fill="#FFFFFF" fillOpacity="0.75" />
  </g>
);

export const CalendarSymbol: FC = () => (
  <g>
    <rect
      x="13"
      y="17"
      width="36"
      height="32"
      rx="4"
      fill="#FFFFFF"
      fillOpacity="0.28"
    />
    <rect
      x="13"
      y="17"
      width="36"
      height="10"
      rx="4"
      fill="#000000"
      fillOpacity="0.22"
    />
    <line
      x1="21"
      y1="13"
      x2="21"
      y2="20"
      stroke="#FFFFFF"
      strokeOpacity="0.7"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="41"
      y1="13"
      x2="41"
      y2="20"
      stroke="#FFFFFF"
      strokeOpacity="0.7"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="21" cy="34" r="2" fill="#FFFFFF" fillOpacity="0.85" />
    <circle cx="31" cy="34" r="2" fill="#FFFFFF" fillOpacity="0.85" />
    <circle cx="41" cy="34" r="2" fill="#FFFFFF" fillOpacity="0.45" />
    <circle cx="21" cy="42" r="2" fill="#FFFFFF" fillOpacity="0.45" />
  </g>
);

export const ProfileSymbol: FC = () => (
  <g>
    <circle cx="31" cy="24" r="7" fill="#FFFFFF" fillOpacity="0.55" />
    <path
      d="M16 50 Q16 38 31 38 Q46 38 46 50 Z"
      fill="#FFFFFF"
      fillOpacity="0.55"
    />
  </g>
);

export const dockIcons = {
  home: HomeSymbol,
  explore: CompassSymbol,
  askAi: SparkleSymbol,
  bookings: CalendarSymbol,
  me: ProfileSymbol,
} as const;

export type DockIconKey = keyof typeof dockIcons;
