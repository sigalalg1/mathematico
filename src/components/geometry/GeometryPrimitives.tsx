import type { ReactNode, PointerEventHandler } from 'react';
import type { Point } from '../../types/geometry';
import type { AngleType7 } from '../../geometry/types';
import type { GeometryStyleTokens } from '../../geometry/style';
import { directionDegrees, normalizeDegrees, pointFromAngle, rayEndpoint } from '../../geometry/angleMath';

/**
 * The SVG rendering half of the geometry engine. Every component here is a
 * pure function of plain data + a `GeometryStyleTokens` preset — no
 * grade-specific assumptions, no state. `components/geometry/GeometryStage`
 * composes these into full scenes; Grade 7 page components in `src/pages`
 * compose scenes into exercises.
 */

/** Faint background grid, purely decorative — the optional coordinate-grid backdrop. */
export function GeoGrid({ style }: { style: GeometryStyleTokens }) {
  const { width, height } = style.viewBox;
  const step = 20;
  const verticals = [];
  const horizontals = [];
  for (let x = 0; x <= width; x += step) verticals.push(x);
  for (let y = 0; y <= height; y += step) horizontals.push(y);
  return (
    <g className="geo-grid" aria-hidden="true">
      {verticals.map((x) => (
        <line key={`geo-grid-v-${x}`} x1={x} y1={0} x2={x} y2={height} stroke={style.colors.grid} strokeWidth={style.gridStrokeWidth} />
      ))}
      {horizontals.map((y) => (
        <line key={`geo-grid-h-${y}`} x1={0} y1={y} x2={width} y2={y} stroke={style.colors.grid} strokeWidth={style.gridStrokeWidth} />
      ))}
    </g>
  );
}

/**
 * A ray drawn from `vertex` toward `through`. Always rendered at the preset's
 * fixed `rayLength`, regardless of how far `through` actually is — ray length
 * must never be a usable visual cue for angle size (chapter 22's explicit,
 * textbook-sourced requirement).
 */
export function GeoRay({
  vertex,
  through,
  style,
  color,
  testId,
}: {
  vertex: Point;
  through: Point;
  style: GeometryStyleTokens;
  color?: string;
  testId?: string;
}) {
  const end = rayEndpoint(vertex, through, style.rayLength);
  return (
    <line
      className="geo-ray"
      x1={vertex.x}
      y1={vertex.y}
      x2={end.x}
      y2={end.y}
      stroke={color ?? style.colors.ray}
      strokeWidth={style.strokeWidth}
      strokeLinecap="round"
      data-testid={testId}
    />
  );
}

/** A plain segment between two exact points (as opposed to a fixed-length ray) — used for triangle/polygon edges. */
export function GeoSegment({ a, b, style, color, dashed }: { a: Point; b: Point; style: GeometryStyleTokens; color?: string; dashed?: boolean }) {
  return (
    <line
      className="geo-segment"
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={color ?? style.colors.ray}
      strokeWidth={style.strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashed ? '4 4' : undefined}
    />
  );
}

/** A labeled point: a small dot plus its capital-letter label, offset so the label never sits on top of a line. */
export function GeoPoint({
  point,
  label,
  style,
  emphasis = 'vertex',
  labelAngleDeg,
}: {
  point: Point;
  label?: string;
  style: GeometryStyleTokens;
  emphasis?: 'vertex' | 'point';
  labelAngleDeg?: number;
}) {
  const radius = emphasis === 'vertex' ? style.vertexRadius : style.vertexRadius * 0.85;
  const labelPos =
    labelAngleDeg !== undefined
      ? pointFromAngle(point, labelAngleDeg, style.labelOffset)
      : { x: point.x + style.labelOffset * 0.55, y: point.y - style.labelOffset * 0.55 };
  return (
    <g className="geo-point">
      <circle cx={point.x} cy={point.y} r={radius} fill={style.colors.vertex} />
      {label && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fontSize={style.labelFontSize}
          fill={style.colors.vertexLabel}
          textAnchor="middle"
          dominantBaseline="middle"
          className="geo-label"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function rightAngleMarkerPath(vertex: Point, startDeg: number, endDeg: number, size: number): string {
  const a = pointFromAngle(vertex, startDeg, size);
  const c = pointFromAngle(vertex, endDeg, size);
  const b = { x: a.x + (c.x - vertex.x), y: a.y + (c.y - vertex.y) };
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`;
}

/**
 * The arc between two rays sharing a vertex — the core angle visual. Renders
 * a right-angle square marker instead of a curved arc whenever `type` is
 * exactly `'right'` (never for a merely-close-to-90° angle — see the
 * classification QA note in `geometry/angleMath`), and always draws the
 * minor (<=180°) arc, matching the textbook convention that two rays name
 * the smaller of the two angles they determine unless a reflex angle is
 * explicitly marked (out of scope here).
 *
 * `radiusIndex` steps the arc radius outward so several angles sharing one
 * vertex (the ∠BAC / ∠BAD / ∠CAD worked example) get visually distinct,
 * non-overlapping arcs; `colorIndex` likewise rotates through the preset's
 * accent colors.
 */
export function GeoAngleArc({
  vertex,
  fromThrough,
  toThrough,
  style,
  type,
  colorIndex = 0,
  radiusIndex = 0,
  label,
  testId,
}: {
  vertex: Point;
  fromThrough: Point;
  toThrough: Point;
  style: GeometryStyleTokens;
  type?: AngleType7;
  colorIndex?: number;
  radiusIndex?: number;
  label?: ReactNode;
  testId?: string;
}) {
  const startDeg = normalizeDegrees(directionDegrees(vertex, fromThrough));
  const rawSweep = normalizeDegrees(directionDegrees(vertex, toThrough) - startDeg);
  // Draw the minor arc: if the raw CCW sweep is reflex, go the other way instead.
  const endDeg = rawSweep > 180 ? startDeg - (360 - rawSweep) : startDeg + rawSweep;
  const radius = style.arcBaseRadius + radiusIndex * style.arcStep;
  const color = style.colors.arc[colorIndex % style.colors.arc.length];
  const isRight = type === 'right';

  const start = pointFromAngle(vertex, startDeg, radius);
  const end = pointFromAngle(vertex, endDeg, radius);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweepFlag = endDeg > startDeg ? 1 : 0;

  const midDeg = (startDeg + endDeg) / 2;
  const labelPos = pointFromAngle(vertex, midDeg, radius + style.labelOffset * 0.8);

  return (
    <g className={`geo-angle-arc${isRight ? ' geo-angle-right' : ''}`} data-testid={testId}>
      {isRight ? (
        <path
          d={rightAngleMarkerPath(vertex, startDeg, endDeg, style.rightAngleMarkerSize)}
          fill="none"
          stroke={color}
          strokeWidth={style.strokeWidth}
        />
      ) : (
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`}
          fill="none"
          stroke={color}
          strokeWidth={style.strokeWidth}
        />
      )}
      {label !== undefined && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fontSize={style.labelFontSize}
          fill={color}
          textAnchor="middle"
          dominantBaseline="middle"
          className="geo-angle-label"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** A closed polygon outline — enough to place/label vertices and highlight an interior angle of a triangle. */
export function GeoPolygon({ points, style, fill = true }: { points: Point[]; style: GeometryStyleTokens; fill?: boolean }) {
  return (
    <polygon
      className="geo-polygon"
      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      stroke={style.colors.polygon}
      strokeWidth={style.strokeWidth}
      fill={fill ? style.colors.polygonFill : 'none'}
    />
  );
}

/**
 * A touch-friendly draggable/selectable handle: a large invisible hit target
 * (`handleHitRadius`) around a small visible dot (`handleRadius`), so
 * dragging or tapping never has to be pixel-perfect. Pointer handlers are
 * passed in by `useDragHandle` (drag) or a plain `onClick`-style callback
 * (select), so the same primitive serves both interaction styles.
 */
export function GeoHandle({
  point,
  style,
  active,
  selected,
  ariaLabel,
  testId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClick,
}: {
  point: Point;
  style: GeometryStyleTokens;
  active?: boolean;
  selected?: boolean;
  ariaLabel: string;
  testId?: string;
  onPointerDown?: PointerEventHandler<SVGCircleElement>;
  onPointerMove?: PointerEventHandler<SVGCircleElement>;
  onPointerUp?: PointerEventHandler<SVGCircleElement>;
  onPointerCancel?: PointerEventHandler<SVGCircleElement>;
  onClick?: () => void;
}) {
  return (
    <g className={`geo-handle-group${selected ? ' is-selected' : ''}`}>
      <circle
        cx={point.x}
        cy={point.y}
        r={style.handleHitRadius}
        fill="transparent"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={selected}
        className="geo-handle-hit"
        data-testid={testId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      />
      <circle
        cx={point.x}
        cy={point.y}
        r={style.handleRadius}
        fill={active || selected ? style.colors.handleActive : style.colors.handle}
        className="geo-handle"
      />
    </g>
  );
}
