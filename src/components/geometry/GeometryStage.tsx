import type { ReactNode } from 'react';
import type { GeometryStyleTokens } from '../../geometry/style';
import { GeoGrid } from './GeometryPrimitives';
import './GeometryScene.css';

interface GeometryStageProps {
  style: GeometryStyleTokens;
  /** Accessible name for the whole diagram when it is purely decorative (no interactive children). */
  label: string;
  grid?: boolean;
  /** True once the SVG contains its own interactive controls (handles, clickable angles) — keeps it out of the a11y tree as a plain `role="img"` in that case. */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The SVG canvas every geometry scene renders into: fixed viewBox from the
 * active style preset, forced LTR (angle diagrams must never mirror under
 * Hebrew RTL), and an optional faint coordinate-grid backdrop.
 */
export function GeometryStage({ style, label, grid, interactive, className, children }: GeometryStageProps) {
  return (
    <svg
      className={`geo-stage${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${style.viewBox.width} ${style.viewBox.height}`}
      role={interactive ? undefined : 'img'}
      aria-label={interactive ? undefined : label}
      style={{ direction: 'ltr' }}
      data-testid="geometry-stage"
    >
      {grid && <GeoGrid style={style} />}
      {children}
    </svg>
  );
}
