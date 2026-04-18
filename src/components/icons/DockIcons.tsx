import type { SVGProps } from 'react';

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 11 L12 4 L20 11 V20 H4 Z" />
      <path d="M9 20 V14 H15 V20" />
    </svg>
  );
}

export function ExploreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M15 9 L13 13 L9 15 L11 11 Z" />
    </svg>
  );
}

export function AssistantIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3 L13.8 9.2 L20 11 L13.8 12.8 L12 19 L10.2 12.8 L4 11 L10.2 9.2 Z" />
    </svg>
  );
}

export function BookingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9 H20" />
      <path d="M9 3 V7" />
      <path d="M15 3 V7" />
    </svg>
  );
}

export function MeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20 Q5 14 12 14 Q19 14 19 20" />
    </svg>
  );
}
