'use client';

import { forwardRef, type SVGProps } from 'react';

export interface OpenBookMarkProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  strokeWidth?: number;
}

export const OpenBookMark = forwardRef<SVGSVGElement, OpenBookMarkProps>(
  function OpenBookMark({ size = 24, strokeWidth = 1.6, style, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="none"
        width={size}
        height={size}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        aria-hidden="true"
        style={style}
        {...rest}
      >
        <path d="M12 2.6 L21.4 12 L12 21.4 L2.6 12 Z" />
        <path d="M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z" />
      </svg>
    );
  }
);
