/**
 * Simple single-weight line icons, used only for real navigation and
 * functional controls that already exist in the app. No decorative iconography.
 */

import type { SVGProps } from 'react';

const BASE: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

/** My activity / progress. */
export function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M5 19V11" />
      <path d="M12 19V5" />
      <path d="M19 19v-5" />
    </svg>
  );
}

/** Account / profile. */
export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} {...BASE}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.75 19.25a7.25 7.25 0 0 1 14.5 0" />
    </svg>
  );
}

/** Install to home screen. */
export function InstallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} {...BASE}>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 18.5h14" />
    </svg>
  );
}

/** Coordinate-plane motif used as the Coordinate System topic glyph. */
export function GridGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} {...BASE} strokeWidth={1.5}>
      <path d="M12 4v16M4 12h16" />
      <circle cx="16.5" cy="7.5" r="1.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
