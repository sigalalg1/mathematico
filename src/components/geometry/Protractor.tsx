import type { Point } from '../../types/geometry';
import type { GeometryStyleTokens } from '../../geometry/style';
import { pointFromAngle } from '../../geometry/angleMath';

/**
 * A reusable, purely presentational digital protractor overlay: a
 * semicircular (180°) scale whose own baseline (the 0°/180° straight edge)
 * is positioned by the caller to align with one fixed reference ray already
 * drawn in the scene — exactly how a real protractor is placed in the
 * classroom (its flat edge laid along one ray), never a free-floating
 * control the student drags around.
 *
 * This component never knows or reveals which angle is being asked about: it
 * draws the same fixed 0–180 scale every time, at the position/orientation it
 * is told to. The *reading* is entirely up to whoever is looking at it,
 * exactly like a real protractor's printed markings carry no information
 * about any one particular angle.
 */

export interface ProtractorProps {
  /** The protractor's own center — always the scene's vertex, where the two rays meet. */
  vertex: Point;
  /**
   * Direction (the engine's own `directionDegrees`/`pointFromAngle` degree
   * convention) the protractor's 0°/180° baseline aligns to — i.e. the
   * actual drawn direction of the scene's one fixed reference ray. The
   * tick marked "0" sits exactly on this direction; "180" sits exactly
   * opposite it, so the full baseline is the straight line through both.
   */
  baselineDeg: number;
  /** Radius (viewBox units) of the printed arc/tick scale. */
  radius: number;
  style: GeometryStyleTokens;
  /**
   * Which rotational direction (relative to `baselineDeg`, in the same
   * +degrees-per-step convention as `pointFromAngle`) the 0→180 numbering
   * sweeps. A caller must only ever draw the measured ray on this same side,
   * or the number under it would not match its real angle. Defaults to +1,
   * the one direction this unit's own Measure-the-Angle activity uses.
   */
  sweep?: 1 | -1;
}

const MAJOR_TICK_STEP_DEG = 10;
const MINOR_TICK_STEP_DEG = 2;

export function Protractor({ vertex, baselineDeg, radius, style, sweep = 1 }: ProtractorProps) {
  const majorTicks: number[] = [];
  const minorTicks: number[] = [];
  for (let n = 0; n <= 180; n += MINOR_TICK_STEP_DEG) {
    if (n % MAJOR_TICK_STEP_DEG === 0) majorTicks.push(n);
    else minorTicks.push(n);
  }

  const angleFor = (n: number) => baselineDeg + sweep * n;
  const baselineA = pointFromAngle(vertex, angleFor(0), radius);
  const baselineB = pointFromAngle(vertex, angleFor(180), radius);
  const sweepFlag = sweep === 1 ? 1 : 0;

  const tickFontSize = Math.max(8, style.labelFontSize * 0.58);

  return (
    <g className="geo-protractor" aria-hidden="true" data-testid="geo-protractor">
      {/* The clear plastic body — a translucent wedge, purely decorative. */}
      <path
        d={`M ${vertex.x} ${vertex.y} L ${baselineA.x} ${baselineA.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${baselineB.x} ${baselineB.y} Z`}
        fill="var(--surface)"
        fillOpacity={0.55}
        stroke="none"
      />
      {/* The full baseline edge — one straight line through the vertex, aligned to the fixed reference ray. */}
      <line
        x1={baselineA.x}
        y1={baselineA.y}
        x2={baselineB.x}
        y2={baselineB.y}
        stroke="var(--border)"
        strokeWidth={style.strokeWidth}
        strokeDasharray="2 4"
        data-testid="geo-protractor-baseline"
      />
      {/* The outer rim. */}
      <path
        d={`M ${baselineA.x} ${baselineA.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${baselineB.x} ${baselineB.y}`}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={style.strokeWidth}
      />
      {minorTicks.map((n) => {
        const inner = pointFromAngle(vertex, angleFor(n), radius - 4);
        const outer = pointFromAngle(vertex, angleFor(n), radius);
        return <line key={`protractor-minor-${n}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--muted)" strokeWidth={1} />;
      })}
      {majorTicks.map((n) => {
        const inner = pointFromAngle(vertex, angleFor(n), radius - 8);
        const outer = pointFromAngle(vertex, angleFor(n), radius);
        const labelPos = pointFromAngle(vertex, angleFor(n), radius + 13);
        return (
          <g key={`protractor-major-${n}`}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--text)" strokeWidth={style.strokeWidth} />
            <text
              x={labelPos.x}
              y={labelPos.y}
              fontSize={tickFontSize}
              fill="var(--muted)"
              textAnchor="middle"
              dominantBaseline="middle"
              data-testid={`protractor-tick-${n}`}
            >
              {n}
            </text>
          </g>
        );
      })}
    </g>
  );
}
