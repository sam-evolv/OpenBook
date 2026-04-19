import type { SVGProps } from 'react';

export type BusinessSymbolId =
  | 'evolv'
  | 'refresh'
  | 'saltwater'
  | 'nail-studio'
  | 'cork-physio'
  | 'yoga-flow'
  | 'iron-gym';

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 32 32',
};

function Evolv(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M8 22 L16 8 L24 22" />
      <path d="M11 22 L16 13 L21 22" />
      <circle cx="16" cy="25" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Refresh(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M10 9 L10 23" />
      <path d="M22 9 L22 23" />
      <path d="M10 14 L22 14" />
      <path d="M10 18 L22 18" />
      <circle cx="16" cy="9" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Saltwater(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 18 Q10 14 14 18 T22 18 T26 18" />
      <path d="M6 22 Q10 18 14 22 T22 22 T26 22" />
      <path d="M11 12 Q12 10 11 8" />
      <path d="M16 12 Q17 10 16 8" />
      <path d="M21 12 Q22 10 21 8" />
    </svg>
  );
}

function NailStudio(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M13 6 L13 19 Q13 22 16 22 Q19 22 19 19 L19 6 Q19 4 16 4 Q13 4 13 6 Z" />
      <path d="M13 19 L19 19" />
      <path d="M14 26 L18 26" />
    </svg>
  );
}

function CorkPhysio(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="16" cy="9" r="3" />
      <path d="M16 12 L16 20" />
      <path d="M11 16 L21 16" />
      <path d="M13 26 L16 20 L19 26" />
    </svg>
  );
}

function YogaFlow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="16" cy="8" r="2.5" />
      <path d="M16 11 L16 18" />
      <path d="M8 14 L16 16 L24 14" />
      <path d="M16 18 L11 26" />
      <path d="M16 18 L21 26" />
    </svg>
  );
}

function IronGym(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="6" y="13" width="3" height="6" rx="1" />
      <rect x="23" y="13" width="3" height="6" rx="1" />
      <rect x="9" y="14" width="2" height="4" />
      <rect x="21" y="14" width="2" height="4" />
      <path d="M11 16 L21 16" strokeWidth="2" />
    </svg>
  );
}

const SYMBOL_MAP: Record<BusinessSymbolId, (p: SVGProps<SVGSVGElement>) => JSX.Element> = {
  evolv: Evolv,
  refresh: Refresh,
  saltwater: Saltwater,
  'nail-studio': NailStudio,
  'cork-physio': CorkPhysio,
  'yoga-flow': YogaFlow,
  'iron-gym': IronGym,
};

export function BusinessSymbol({
  id,
  ...props
}: { id: BusinessSymbolId } & SVGProps<SVGSVGElement>) {
  const Component = SYMBOL_MAP[id];
  return Component ? <Component {...props} /> : null;
}
