import { useId, type KeyboardEvent } from 'react';
import { formatSigned } from '../utils/signedNumbers';
import './NumberLine.css';

export type NumberLineVariant = 'default' | 'start' | 'result' | 'ghost' | 'correct' | 'incorrect';

export interface NumberLineMarker {
  id: string;
  value: number;
  /** Short caption drawn above the marker, e.g. "A" or "-3". */
  label?: string;
  variant?: NumberLineVariant;
}

export interface NumberLineClickable {
  id: string;
  value: number;
  /** When given, the point is drawn as a named dot; otherwise as a bare clickable tick. */
  label?: string;
}

/** A curved arrow above the line showing a move from one value to another. */
export interface NumberLineHop {
  id: string;
  from: number;
  to: number;
  label?: string;
  variant?: 'default' | 'correct' | 'incorrect';
}

/** A bracket under the line measuring the gap between two values, e.g. a distance from 0. */
export interface NumberLineSpan {
  id: string;
  from: number;
  to: number;
  label?: string;
  variant?: 'default' | 'correct' | 'incorrect';
}

/** A translucent band along the line, e.g. "every number greater than -3". */
export interface NumberLineRegion {
  id: string;
  from: number;
  to: number;
  variant?: 'default' | 'correct' | 'incorrect';
}

interface NumberLineProps {
  min: number;
  max: number;
  /** Distance between drawn ticks, in value units. Defaults to 1. */
  step?: number;
  /** Which tick values show their number. Omit (or pass null) to label every tick. */
  labeledValues?: number[] | null;
  markers?: NumberLineMarker[];
  /** A marker that slides smoothly whenever its value changes. */
  walker?: { value: number; label?: string } | null;
  hops?: NumberLineHop[];
  /** Replays the hop draw-in animation whenever this changes. */
  hopSeed?: number | string;
  spans?: NumberLineSpan[];
  regions?: NumberLineRegion[];
  clickablePoints?: NumberLineClickable[];
  onSelectPoint?: (id: string) => void;
  selectedPointId?: string | null;
  correctPointId?: string | null;
  /** Reveals correct/incorrect styling on the clickable points. */
  pointsAnswered?: boolean;
  /** Blocks further clicks. Defaults to `pointsAnswered`. */
  pointsLocked?: boolean;
  size?: 'md' | 'lg';
}

const VIEW_W = 640;
const VIEW_H = 172;
const PAD_X = 34;
const LINE_Y = 86;
const LABEL_Y = LINE_Y + 24;
const SPAN_TOP = LINE_Y + 32;
const SPAN_Y = LINE_Y + 52;
const TICK_HALF = 6;
const MIN_ARC = 30;
const MAX_ARC = 62;

/**
 * A prop-driven, presentation-only number line shared by every Signed Numbers
 * activity. It holds no state and generates nothing: what it draws is entirely
 * decided by the caller, exactly like `CoordinateGrid` does for the plane.
 */
export function NumberLine({
  min,
  max,
  step = 1,
  labeledValues = null,
  markers = [],
  walker = null,
  hops = [],
  hopSeed = 0,
  spans = [],
  regions = [],
  clickablePoints = [],
  onSelectPoint,
  selectedPointId = null,
  correctPointId = null,
  pointsAnswered = false,
  pointsLocked = pointsAnswered,
  size = 'md',
}: NumberLineProps) {
  const lineId = useId();
  const span = max - min;
  const usable = VIEW_W - PAD_X * 2;
  const toScreenX = (value: number) => (span === 0 ? VIEW_W / 2 : PAD_X + ((value - min) / span) * usable);

  const ticks: number[] = [];
  for (let value = min; value <= max + 1e-9; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  const showsLabel = (value: number) => labeledValues === null || labeledValues.includes(value);

  const isInteractive = clickablePoints.length > 0;
  // Long lines put their tick labels close together, so they get a smaller size.
  const dense = ticks.length > 21;

  function handleKeyDown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectPoint?.(id);
    }
  }

  function arcPath(from: number, to: number): string {
    const x1 = toScreenX(from);
    const x2 = toScreenX(to);
    const width = Math.abs(x2 - x1);
    const height = Math.min(MAX_ARC, Math.max(MIN_ARC, width * 0.55));
    return `M ${x1} ${LINE_Y - 4} Q ${(x1 + x2) / 2} ${LINE_Y - 4 - height * 2} ${x2} ${LINE_Y - 4}`;
  }

  function arcPeakY(from: number, to: number): number {
    const width = Math.abs(toScreenX(to) - toScreenX(from));
    const height = Math.min(MAX_ARC, Math.max(MIN_ARC, width * 0.55));
    return LINE_Y - 4 - height;
  }

  return (
    <div className={`number-line ${size === 'lg' ? 'number-line-lg' : ''}`} dir="ltr">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={`number-line-svg ${dense ? 'number-line-dense' : ''}`}
        role={isInteractive ? undefined : 'img'}
        aria-hidden={isInteractive ? undefined : true}
      >
        <defs>
          <marker id={`${lineId}-axis-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="number-line-arrow-head" />
          </marker>
          <marker id={`${lineId}-hop-arrow`} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" className="number-line-hop-head" />
          </marker>
        </defs>

        {regions.map((region) => {
          const x1 = toScreenX(Math.min(region.from, region.to));
          const x2 = toScreenX(Math.max(region.from, region.to));
          return (
            <rect
              key={`region-${region.id}`}
              x={x1}
              y={LINE_Y - 20}
              width={Math.max(2, x2 - x1)}
              height={40}
              className={`number-line-region number-line-region-${region.variant ?? 'default'}`}
            />
          );
        })}

        <line
          x1={PAD_X - 18}
          y1={LINE_Y}
          x2={VIEW_W - PAD_X + 18}
          y2={LINE_Y}
          className="number-line-axis"
          markerEnd={`url(#${lineId}-axis-arrow)`}
        />
        <line x1={PAD_X - 18} y1={LINE_Y} x2={PAD_X - 4} y2={LINE_Y} className="number-line-axis-tail" />

        {ticks.map((value) => (
          <g key={`tick-${value}`}>
            <line
              x1={toScreenX(value)}
              y1={LINE_Y - TICK_HALF}
              x2={toScreenX(value)}
              y2={LINE_Y + TICK_HALF}
              className={value === 0 ? 'number-line-tick number-line-tick-zero' : 'number-line-tick'}
            />
            {showsLabel(value) && (
              <text x={toScreenX(value)} y={LABEL_Y} textAnchor="middle" className="number-line-tick-label">
                {formatSigned(value)}
              </text>
            )}
          </g>
        ))}

        {hops.map((hop) => (
          <g key={`hop-${hop.id}-${hopSeed}`} className={`number-line-hop number-line-hop-${hop.variant ?? 'default'}`}>
            <path d={arcPath(hop.from, hop.to)} className="number-line-hop-path" markerEnd={`url(#${lineId}-hop-arrow)`} />
            {hop.label && (
              <text
                x={(toScreenX(hop.from) + toScreenX(hop.to)) / 2}
                y={arcPeakY(hop.from, hop.to) - 6}
                textAnchor="middle"
                className="number-line-hop-label"
              >
                {hop.label}
              </text>
            )}
          </g>
        ))}

        {spans.map((spanItem) => {
          const x1 = toScreenX(spanItem.from);
          const x2 = toScreenX(spanItem.to);
          return (
            <g key={`span-${spanItem.id}`} className={`number-line-span number-line-span-${spanItem.variant ?? 'default'}`}>
              <path
                d={`M ${x1} ${SPAN_TOP} L ${x1} ${SPAN_Y} L ${x2} ${SPAN_Y} L ${x2} ${SPAN_TOP}`}
                className="number-line-span-bracket"
              />
              {spanItem.label && (
                <text x={(x1 + x2) / 2} y={SPAN_Y + 18} textAnchor="middle" className="number-line-span-label">
                  {spanItem.label}
                </text>
              )}
            </g>
          );
        })}

        {markers.map((marker) => (
          <g key={`marker-${marker.id}`} className={`number-line-marker number-line-marker-${marker.variant ?? 'default'}`}>
            <circle cx={toScreenX(marker.value)} cy={LINE_Y} r={8} className="number-line-marker-dot" />
            {marker.label && (
              <text x={toScreenX(marker.value)} y={LINE_Y - 16} textAnchor="middle" className="number-line-marker-label">
                {marker.label}
              </text>
            )}
          </g>
        ))}

        {walker && (
          <g className="number-line-walker" transform={`translate(${toScreenX(walker.value)}, ${LINE_Y})`}>
            <circle r={10} className="number-line-walker-dot" />
            {walker.label && (
              <text y={-18} textAnchor="middle" className="number-line-walker-label">
                {walker.label}
              </text>
            )}
          </g>
        )}

        {clickablePoints.map((candidate) => {
          const stateClass = pointsAnswered
            ? candidate.id === correctPointId
              ? 'is-correct'
              : candidate.id === selectedPointId
                ? 'is-incorrect'
                : ''
            : '';
          const x = toScreenX(candidate.value);
          return (
            <g
              key={`clickable-${candidate.id}`}
              role="button"
              tabIndex={pointsLocked ? -1 : 0}
              aria-label={candidate.label ?? formatSigned(candidate.value)}
              className={`number-line-point ${candidate.label ? 'is-named' : ''} ${stateClass} ${pointsLocked ? 'is-disabled' : ''}`}
              onClick={() => onSelectPoint?.(candidate.id)}
              onKeyDown={(event) => handleKeyDown(event, candidate.id)}
            >
              <rect x={x - 13} y={LINE_Y - 22} width={26} height={44} className="number-line-point-hit" />
              <circle cx={x} cy={LINE_Y} r={candidate.label ? 8 : 6} className="number-line-point-dot" />
              {candidate.label && (
                <text x={x} y={LINE_Y - 18} textAnchor="middle" className="number-line-point-label">
                  {candidate.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
