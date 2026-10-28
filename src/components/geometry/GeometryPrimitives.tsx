import { useId, type ReactNode, type PointerEventHandler } from 'react';
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
  filled,
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
  /**
   * Shades the angle's interior as a translucent pie slice, not just its
   * boundary arc. An angle's stroke-only arc reads fine up to roughly a
   * right angle, but a wide obtuse angle's minor arc sweeps nearly the
   * whole circle — a thin gap becomes the eye's most salient feature, and a
   * child (or adult) can misread "almost a full circle" as small rather
   * than large. A filled wedge makes magnitude read as area, which stays
   * unambiguous at any angle up to 180°. Opt-in (not every exercise needs
   * the extra visual weight), used by the size-comparison activity where
   * misjudging a near-straight angle directly produces a wrong answer.
   */
  filled?: boolean;
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
        <>
          {filled && (
            <path
              d={`M ${vertex.x} ${vertex.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y} Z`}
              fill={color}
              fillOpacity={0.22}
              stroke="none"
              data-testid={testId ? `${testId}-wedge` : undefined}
            />
          )}
          <path
            d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth={style.strokeWidth}
          />
        </>
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

/**
 * The Grade 4 "Learning the Language of Geometry" unit's own primitives.
 * Everything below is still plain, grade-agnostic SVG rendering of generic
 * points — nothing here is specific to Grade 4 — so it is just as reusable by
 * any future geometry content as the primitives above it.
 */

/**
 * An *open* chain of straight segments: `points[0]` to `points[1]` to ... but
 * never closed back to the first point. This is the deliberate non-example
 * rendering for "not a polygon because the shape never closes" — a plain
 * `GeoPolygon` cannot represent it, since an SVG `<polygon>` always closes
 * itself automatically.
 */
export function GeoOpenChain({ points, style, color }: { points: Point[]; style: GeometryStyleTokens; color?: string }) {
  return (
    <polyline
      className="geo-open-chain"
      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      stroke={color ?? style.colors.polygon}
      strokeWidth={style.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** A smooth (quadratic-through-midpoints) path through `points` — the deliberate non-example of "sides must be straight," closed or open. */
export function GeoCurvedChain({
  points,
  style,
  color,
  closed,
  fill,
}: {
  points: Point[];
  style: GeometryStyleTokens;
  color?: string;
  closed?: boolean;
  fill?: boolean;
}) {
  if (points.length < 2) return null;
  const loop = closed ? [...points, points[0]] : points;
  let d = `M ${loop[0].x} ${loop[0].y}`;
  for (let i = 1; i < loop.length; i += 1) {
    const prev = loop[i - 1];
    const curr = loop[i];
    const control = { x: (prev.x + curr.x) / 2 + (curr.y - prev.y) * 0.18, y: (prev.y + curr.y) / 2 - (curr.x - prev.x) * 0.18 };
    d += ` Q ${control.x} ${control.y} ${curr.x} ${curr.y}`;
  }
  if (closed) d += ' Z';
  return (
    <path
      className="geo-curved-chain"
      d={d}
      stroke={color ?? style.colors.polygon}
      strokeWidth={style.strokeWidth}
      strokeLinecap="round"
      fill={fill && closed ? style.colors.polygonFill : 'none'}
    />
  );
}

/**
 * Small "arrow" tick marks placed at a segment's midpoint, perpendicular to
 * it — the standard notation for "these sides are parallel." Two segments
 * drawn with the *same* `count` are claiming to be parallel to each other;
 * generators must keep that in sync with `segmentsAreParallel`.
 */
export function GeoParallelTicks({
  a,
  b,
  style,
  count = 1,
  color,
}: {
  a: Point;
  b: Point;
  style: GeometryStyleTokens;
  count?: number;
  color?: string;
}) {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const segDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const tickLength = style.vertexRadius * 1.8;
  const spacing = style.vertexRadius * 1.1;
  const tickColor = color ?? style.colors.handleActive;
  return (
    <g className="geo-parallel-ticks">
      {Array.from({ length: count }, (_, i) => {
        const offset = (i - (count - 1) / 2) * spacing;
        const center = pointFromAngle(mid, segDeg, offset);
        const p1 = pointFromAngle(center, segDeg + 60, tickLength / 2);
        const p2 = pointFromAngle(center, segDeg - 120, tickLength / 2);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={tickColor} strokeWidth={style.strokeWidth} strokeLinecap="round" />;
      })}
    </g>
  );
}

/**
 * Fills a closed shape's interior with a grid of colored unit squares — the
 * "area is the region covered, measured in square units" visual from the
 * brief's measurement-vocabulary group. Purely illustrative (no count is
 * exposed as a gradable answer by this primitive); it exists so area reads as
 * *tiled area*, not as an abstract color wash.
 */
export function GeoAreaFill({ points, style, cellSize = 16, color }: { points: Point[]; style: GeometryStyleTokens; cellSize?: number; color?: string }) {
  const reactId = useId();
  const clipId = `geo-area-clip-${reactId}`;
  const { width, height } = style.viewBox;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const fill = color ?? style.colors.polygon;
  return (
    <g className="geo-area-fill" data-testid="geo-area-fill">
      <clipPath id={clipId}>
        <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => (
            <rect
              key={`${row}-${col}`}
              x={col * cellSize}
              y={row * cellSize}
              width={cellSize}
              height={cellSize}
              fill={fill}
              fillOpacity={(row + col) % 2 === 0 ? 0.3 : 0.16}
              stroke={style.colors.grid}
              strokeWidth={0.5}
            />
          )),
        )}
      </g>
    </g>
  );
}

/**
 * Traces a shape's boundary in an accent stroke, optionally animated as a
 * dash tracing around it (a line "traveling around the edge") — the
 * perimeter-vocabulary visual. The animation is a decorative CSS class only
 * (`geo-perimeter-animated`, scoped in `GeometryScene.css`) and is disabled
 * under `prefers-reduced-motion`, consistent with the rest of the app's
 * scoped-CSS motion convention.
 */
export function GeoPerimeterTrace({
  points,
  style,
  closed = true,
  animated,
  color,
}: {
  points: Point[];
  style: GeometryStyleTokens;
  closed?: boolean;
  animated?: boolean;
  color?: string;
}) {
  const loop = closed ? [...points, points[0]] : points;
  const d = `M ${loop.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  return (
    <path
      className={`geo-perimeter-trace${animated ? ' geo-perimeter-animated' : ''}`}
      data-testid="geo-perimeter-trace"
      d={d}
      fill="none"
      stroke={color ?? style.colors.handleActive}
      strokeWidth={style.strokeWidth * 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
