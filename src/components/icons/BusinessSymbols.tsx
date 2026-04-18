import type { FC } from 'react';

export type BusinessSymbolId =
  | 'evolv'
  | 'refresh'
  | 'saltwater'
  | 'nail-studio'
  | 'cork-physio'
  | 'yoga-flow'
  | 'iron-gym';

let symbolCounter = 0;
function nextSymbolId(prefix: string): string {
  symbolCounter += 1;
  return `${prefix}-${symbolCounter}`;
}

export const EvolvSymbol: FC = () => (
  <g>
    <path d="M31 46 L39 8 L23 8 L31 46" fill="#FFFFFF" fillOpacity="0.22" />
    <path
      d="M14 24 L48 24 L52 14 L10 14 Z"
      fill="#FFFFFF"
      fillOpacity="0.18"
    />
    <path
      d="M31 46 L35 46 L41 8 L36 8 L30 42 Z"
      fill="#FFFFFF"
      fillOpacity="0.35"
    />
  </g>
);

export const RefreshSymbol: FC = () => (
  <g>
    <circle
      cx="18"
      cy="44"
      r="6"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.55"
      strokeWidth="1.8"
    />
    <circle
      cx="44"
      cy="44"
      r="6"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.55"
      strokeWidth="1.8"
    />
    <path
      d="M22 40 L46 16 M40 40 L18 16"
      stroke="#FFFFFF"
      strokeOpacity="0.7"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="31" cy="28" r="2" fill="#FFFFFF" fillOpacity="0.85" />
  </g>
);

export const SaltwaterSymbol: FC = () => {
  const sunId = nextSymbolId('sw-sun');
  return (
    <g>
      <defs>
        <radialGradient id={sunId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE8A8" />
          <stop offset="0.7" stopColor="#FFD05A" stopOpacity="0.8" />
          <stop offset="1" stopColor="#FFD05A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="31" cy="20" r="7" fill={`url(#${sunId})`} />
      <path
        d="M6 38 Q14 32 22 38 T38 38 T54 38 L58 38 L58 62 L4 62 L4 38 Z"
        fill="#FFFFFF"
        fillOpacity="0.28"
      />
      <path
        d="M6 46 Q14 41 22 46 T38 46 T54 46 L58 46 L58 62 L4 62 L4 46 Z"
        fill="#FFFFFF"
        fillOpacity="0.18"
      />
      <path
        d="M6 54 Q14 50 22 54 T38 54 T54 54 L58 54 L58 62 L4 62 L4 54 Z"
        fill="#FFFFFF"
        fillOpacity="0.12"
      />
    </g>
  );
};

export const NailStudioSymbol: FC = () => (
  <g>
    <path
      d="M23 50 Q20 28 28 18 Q31 15 34 18 Q42 28 39 50 Z"
      fill="#FFFFFF"
      fillOpacity="0.3"
    />
    <path
      d="M25 48 Q23 32 29 22 Q31 20 33 22 Q39 32 37 48"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.5"
      strokeWidth="0.8"
    />
    <ellipse cx="31" cy="19" rx="5" ry="3" fill="#FFFFFF" fillOpacity="0.55" />
    <ellipse cx="31" cy="18" rx="2" ry="1" fill="#FFFFFF" fillOpacity="0.85" />
  </g>
);

export const CorkPhysioSymbol: FC = () => (
  <g>
    <path
      d="M31 48 C22 43 13 34 13 25 C13 20 17 17 21 17 C25 17 28 19 31 23 C34 19 37 17 41 17 C45 17 49 20 49 25 C49 34 40 43 31 48 Z"
      fill="#FFFFFF"
      fillOpacity="0.32"
    />
    <path
      d="M13 31 L21 31 L23 26 L26 36 L29 22 L32 34 L36 31 L49 31"
      stroke="#FFFFFF"
      strokeOpacity="0.85"
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </g>
);

export const YogaFlowSymbol: FC = () => (
  <g>
    <circle
      cx="31"
      cy="31"
      r="18"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.2"
      strokeWidth="1"
    />
    <circle
      cx="31"
      cy="31"
      r="13"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.3"
      strokeWidth="1"
    />
    <circle
      cx="31"
      cy="31"
      r="8"
      fill="none"
      stroke="#FFFFFF"
      strokeOpacity="0.45"
      strokeWidth="1"
    />
    <circle cx="31" cy="31" r="3.5" fill="#FFFFFF" fillOpacity="0.75" />
    <circle cx="31" cy="13" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
    <circle cx="49" cy="31" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
    <circle cx="31" cy="49" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
    <circle cx="13" cy="31" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
  </g>
);

export const IronGymSymbol: FC = () => (
  <g>
    <rect
      x="10"
      y="26"
      width="7"
      height="10"
      rx="2"
      fill="#FFFFFF"
      fillOpacity="0.4"
    />
    <rect
      x="45"
      y="26"
      width="7"
      height="10"
      rx="2"
      fill="#FFFFFF"
      fillOpacity="0.4"
    />
    <rect
      x="17"
      y="22"
      width="5"
      height="18"
      rx="1.5"
      fill="#FFFFFF"
      fillOpacity="0.6"
    />
    <rect
      x="40"
      y="22"
      width="5"
      height="18"
      rx="1.5"
      fill="#FFFFFF"
      fillOpacity="0.6"
    />
    <rect
      x="22"
      y="28"
      width="18"
      height="6"
      rx="2"
      fill="#FFFFFF"
      fillOpacity="0.8"
    />
  </g>
);

export const businessSymbols: Record<BusinessSymbolId, FC> = {
  evolv: EvolvSymbol,
  refresh: RefreshSymbol,
  saltwater: SaltwaterSymbol,
  'nail-studio': NailStudioSymbol,
  'cork-physio': CorkPhysioSymbol,
  'yoga-flow': YogaFlowSymbol,
  'iron-gym': IronGymSymbol,
};
