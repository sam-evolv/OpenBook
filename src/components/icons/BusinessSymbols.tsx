import type { FC } from 'react';

type SymbolProps = { size?: number };

export const EvolvSymbol: FC<SymbolProps> = () => (
  <g opacity={0.22}>
    <rect x={18} y={20} width={26} height={3} rx={1.5} fill="#fff" />
    <rect x={18} y={30} width={20} height={3} rx={1.5} fill="#fff" />
    <rect x={18} y={40} width={26} height={3} rx={1.5} fill="#fff" />
    <rect x={29} y={16} width={4} height={30} rx={2} fill="#fff" />
  </g>
);

export const RefreshSymbol: FC<SymbolProps> = () => (
  <g stroke="#fff" strokeLinecap="round" fill="none">
    <path d="M18 18 L42 40" strokeWidth={2.2} opacity={0.7} />
    <path d="M44 18 L20 40" strokeWidth={2.2} opacity={0.7} />
    <circle cx={20} cy={44} r={4.5} strokeWidth={2} opacity={0.65} />
    <circle cx={42} cy={44} r={4.5} strokeWidth={2} opacity={0.65} />
    <circle cx={31} cy={29} r={1.4} fill="#fff" stroke="none" opacity={0.75} />
  </g>
);

export const SaltwaterSymbol: FC<SymbolProps> = () => (
  <g stroke="#fff" fill="none" strokeLinecap="round">
    <circle cx={31} cy={20} r={6} fill="#fff" opacity={0.28} stroke="none" />
    <path d="M14 34 Q22 30 31 34 T48 34" strokeWidth={2.2} opacity={0.28} />
    <path d="M14 41 Q22 37 31 41 T48 41" strokeWidth={2.2} opacity={0.18} />
    <path d="M14 48 Q22 44 31 48 T48 48" strokeWidth={2.2} opacity={0.12} />
  </g>
);

export const NailStudioSymbol: FC<SymbolProps> = () => (
  <g>
    <path
      d="M31 14 C24 14 21 22 21 32 C21 42 25 48 31 48 C37 48 41 42 41 32 C41 22 38 14 31 14 Z"
      fill="#fff"
      opacity={0.32}
    />
    <path
      d="M31 14 C24 14 21 22 21 28 C23 25 27 23 31 23 C35 23 39 25 41 28 C41 22 38 14 31 14 Z"
      fill="#fff"
      opacity={0.55}
    />
  </g>
);

export const CorkPhysioSymbol: FC<SymbolProps> = () => (
  <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
    <path
      d="M31 44 C18 36 14 28 18 22 C22 16 29 18 31 24 C33 18 40 16 44 22 C48 28 44 36 31 44 Z"
      strokeWidth={2.2}
      opacity={0.7}
    />
    <path
      d="M14 31 L22 31 L25 25 L29 37 L33 28 L36 33 L48 33"
      strokeWidth={2}
      opacity={0.85}
    />
  </g>
);

export const YogaFlowSymbol: FC<SymbolProps> = () => (
  <g fill="none" stroke="#fff" opacity={0.6}>
    <circle cx={31} cy={31} r={18} strokeWidth={1.4} opacity={0.45} />
    <circle cx={31} cy={31} r={13} strokeWidth={1.4} opacity={0.55} />
    <circle cx={31} cy={31} r={8} strokeWidth={1.4} opacity={0.65} />
    <circle cx={31} cy={31} r={2.4} fill="#fff" stroke="none" opacity={0.9} />
    <circle cx={31} cy={11} r={1.6} fill="#fff" stroke="none" opacity={0.7} />
    <circle cx={31} cy={51} r={1.6} fill="#fff" stroke="none" opacity={0.7} />
    <circle cx={11} cy={31} r={1.6} fill="#fff" stroke="none" opacity={0.7} />
    <circle cx={51} cy={31} r={1.6} fill="#fff" stroke="none" opacity={0.7} />
  </g>
);

export const IronGymSymbol: FC<SymbolProps> = () => (
  <g fill="#fff">
    <rect x={13} y={29.5} width={36} height={3} rx={1.5} opacity={0.75} />
    <rect x={10} y={24} width={6} height={14} rx={1.5} opacity={0.85} />
    <rect x={46} y={24} width={6} height={14} rx={1.5} opacity={0.85} />
    <rect x={17} y={26} width={2.4} height={10} rx={1} opacity={0.65} />
    <rect x={42.6} y={26} width={2.4} height={10} rx={1} opacity={0.65} />
  </g>
);

export type BusinessSymbolId =
  | 'evolv'
  | 'refresh'
  | 'saltwater'
  | 'nail-studio'
  | 'cork-physio'
  | 'yoga-flow'
  | 'iron-gym';

export const businessSymbols: Record<BusinessSymbolId, FC<SymbolProps>> = {
  evolv: EvolvSymbol,
  refresh: RefreshSymbol,
  saltwater: SaltwaterSymbol,
  'nail-studio': NailStudioSymbol,
  'cork-physio': CorkPhysioSymbol,
  'yoga-flow': YogaFlowSymbol,
  'iron-gym': IronGymSymbol,
};
