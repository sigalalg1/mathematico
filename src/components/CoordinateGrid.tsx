import { useId, type KeyboardEvent, type MouseEvent } from 'react';
import type { AxisHighlight, QuizAnswerStatus } from '../types/quiz';
import type { GridTargetId } from '../types/vocabularyQuiz';
import './CoordinateGrid.css';

interface CoordinateGridProps {
  min?: number;
  max?: number;
  highlight?: AxisHighlight | null;
  highlightSeed?: number | string;
  /** Marks a single point on the plane. */
  point?: { x: number; y: number } | null;
  /** Pulses a ring around the origin. */
  highlightOrigin?: boolean;
  /** Shades one quadrant (1 = ++, 2 = -+, 3 = --, 4 = +-). */
  quadrant?: 1 | 2 | 3 | 4 | null;
  /** A bullseye marker showing where the real target is. */
  targetMarker?: { x: number; y: number } | null;
  /** Shows a brief hit pulse around the target; replays each time the seed changes. */
  targetHit?: boolean;
  targetHitSeed?: number | string;
  /** Marks where a wrong attempt landed, distinct from the real target. */
  attemptMarker?: { x: number; y: number } | null;
  /** Bumps up the rendered size for games where the grid is the main focus. */
  size?: 'md' | 'lg';
  /** A ship/marker that smoothly animates between positions as it changes. */
  ship?: { x: number; y: number } | null;
  /** Pulses a ring around the ship to celebrate arrival; replays when the seed changes. */
  shipArrived?: boolean;
  shipArrivedSeed?: number | string;
  /** Waypoints already visited, drawn as a subtle connecting trail. */
  trail?: { x: number; y: number }[];
  /** Makes the whole plane clickable; reports the nearest integer coordinate. */
  onGridClick?: (point: { x: number; y: number }) => void;
  /** Renders xAxis/yAxis/origin as clickable answer targets. */
  interactiveTargets?: GridTargetId[];
  targetLabels?: Partial<Record<GridTargetId, string>>;
  selectedTargetId?: GridTargetId | null;
  correctTargetId?: GridTargetId | null;
  status?: QuizAnswerStatus;
  onSelectTarget?: (id: GridTargetId) => void;
}

const VIEW_SIZE = 320;
const AXIS_OVERHANG = 0.35;
const PADDING = 1.5;
const LABEL_OFFSET = 12;

export function CoordinateGrid({
  min = -5,
  max = 5,
  highlight = null,
  highlightSeed = 0,
  point = null,
  highlightOrigin = false,
  quadrant = null,
  targetMarker = null,
  targetHit = false,
  targetHitSeed = 0,
  attemptMarker = null,
  size = 'md',
  ship = null,
  shipArrived = false,
  shipArrivedSeed = 0,
  trail = [],
  onGridClick,
  interactiveTargets,
  targetLabels,
  selectedTargetId = null,
  correctTargetId = null,
  status = 'unanswered',
  onSelectTarget,
}: CoordinateGridProps) {
  const gridId = useId();
  const worldSize = max - min + PADDING * 2;
  const scale = VIEW_SIZE / worldSize;

  const toScreenX = (x: number) => (x - min + PADDING) * scale;
  const toScreenY = (y: number) => VIEW_SIZE - (y - min + PADDING) * scale;

  const ticks: number[] = [];
  for (let n = min; n <= max; n++) {
    if (n !== 0) ticks.push(n);
  }

  const originX = toScreenX(0);
  const originY = toScreenY(0);

  const highlightRange = (region: AxisHighlight['region']): [number, number] => {
    if (region === 'positive') return [0, max];
    if (region === 'negative') return [min, 0];
    return [min, max];
  };

  const answered = status !== 'unanswered';
  const targetStateClass = (targetId: GridTargetId) => {
    if (!answered) return '';
    if (targetId === correctTargetId) return 'is-correct';
    if (targetId === selectedTargetId) return 'is-incorrect';
    return '';
  };
  const hasTarget = (targetId: GridTargetId) => interactiveTargets?.includes(targetId) ?? false;
  const isInteractive = Boolean(interactiveTargets && interactiveTargets.length > 0);

  function handleTargetKeyDown(event: KeyboardEvent, targetId: GridTargetId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectTarget?.(targetId);
    }
  }

  function handleGridClick(event: MouseEvent<SVGRectElement>) {
    if (!onGridClick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const svgX = relX * VIEW_SIZE;
    const svgY = relY * VIEW_SIZE;
    const worldX = Math.round(svgX / scale - PADDING + min);
    const worldY = Math.round((VIEW_SIZE - svgY) / scale + min - PADDING);
    onGridClick({
      x: Math.min(max, Math.max(min, worldX)),
      y: Math.min(max, Math.max(min, worldY)),
    });
  }

  return (
    <div className={`coordinate-grid ${size === 'lg' ? 'coordinate-grid-lg' : ''}`} dir="ltr">
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="coordinate-grid-svg"
        role={isInteractive ? undefined : 'img'}
        aria-hidden={isInteractive ? undefined : true}
      >
        <defs>
          <marker id={`${gridId}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="arrow-head" />
          </marker>
        </defs>

        {quadrant && (
          <rect
            x={toScreenX(quadrant === 2 || quadrant === 3 ? min : 0)}
            y={toScreenY(quadrant === 1 || quadrant === 2 ? max : 0)}
            width={toScreenX(max) - toScreenX(0)}
            height={toScreenY(0) - toScreenY(max)}
            className="quadrant-highlight"
          />
        )}

        {ticks.map((n) => (
          <line
            key={`grid-v-${n}`}
            x1={toScreenX(n)}
            y1={toScreenY(min)}
            x2={toScreenX(n)}
            y2={toScreenY(max)}
            className="grid-line"
          />
        ))}
        {ticks.map((n) => (
          <line
            key={`grid-h-${n}`}
            x1={toScreenX(min)}
            y1={toScreenY(n)}
            x2={toScreenX(max)}
            y2={toScreenY(n)}
            className="grid-line"
          />
        ))}

        {highlight?.axis === 'x' && (
          <line
            key={`highlight-x-${highlightSeed}`}
            x1={toScreenX(highlightRange(highlight.region)[0])}
            y1={originY}
            x2={toScreenX(highlightRange(highlight.region)[1])}
            y2={originY}
            className="axis-highlight"
          />
        )}
        {highlight?.axis === 'y' && (
          <line
            key={`highlight-y-${highlightSeed}`}
            x1={originX}
            y1={toScreenY(highlightRange(highlight.region)[0])}
            x2={originX}
            y2={toScreenY(highlightRange(highlight.region)[1])}
            className="axis-highlight"
          />
        )}

        <line
          x1={toScreenX(min)}
          y1={originY}
          x2={toScreenX(max + AXIS_OVERHANG)}
          y2={originY}
          className="axis-line"
          markerEnd={`url(#${gridId}-arrow)`}
        />
        <line
          x1={originX}
          y1={toScreenY(min)}
          x2={originX}
          y2={toScreenY(max + AXIS_OVERHANG)}
          className="axis-line"
          markerEnd={`url(#${gridId}-arrow)`}
        />
        <circle cx={originX} cy={originY} r={3} className="origin-dot" />

        {ticks.map((n) => (
          <g key={`tick-x-${n}`}>
            <line x1={toScreenX(n)} y1={originY - 4} x2={toScreenX(n)} y2={originY + 4} className="tick-mark" />
            <text x={toScreenX(n)} y={originY + 17} textAnchor="middle" className="tick-label">
              {n}
            </text>
          </g>
        ))}
        {ticks.map((n) => (
          <g key={`tick-y-${n}`}>
            <line x1={originX - 4} y1={toScreenY(n)} x2={originX + 4} y2={toScreenY(n)} className="tick-mark" />
            <text x={originX - 9} y={toScreenY(n) + 4} textAnchor="end" className="tick-label">
              {n}
            </text>
          </g>
        ))}
        <text x={originX - 9} y={originY + 17} textAnchor="end" className="tick-label">
          0
        </text>

        <text x={toScreenX(max) + LABEL_OFFSET} y={originY + 6} textAnchor="start" className="axis-label">
          X
        </text>
        <text x={originX} y={toScreenY(max) - LABEL_OFFSET} textAnchor="middle" className="axis-label">
          Y
        </text>

        {hasTarget('xAxis') && (
          <line
            x1={toScreenX(min)}
            y1={originY}
            x2={toScreenX(max)}
            y2={originY}
            role="button"
            tabIndex={answered ? -1 : 0}
            aria-label={targetLabels?.xAxis}
            className={`grid-target grid-target-line ${targetStateClass('xAxis')} ${answered ? 'is-disabled' : ''}`}
            onClick={() => onSelectTarget?.('xAxis')}
            onKeyDown={(event) => handleTargetKeyDown(event, 'xAxis')}
          />
        )}
        {hasTarget('yAxis') && (
          <line
            x1={originX}
            y1={toScreenY(min)}
            x2={originX}
            y2={toScreenY(max)}
            role="button"
            tabIndex={answered ? -1 : 0}
            aria-label={targetLabels?.yAxis}
            className={`grid-target grid-target-line ${targetStateClass('yAxis')} ${answered ? 'is-disabled' : ''}`}
            onClick={() => onSelectTarget?.('yAxis')}
            onKeyDown={(event) => handleTargetKeyDown(event, 'yAxis')}
          />
        )}
        {hasTarget('origin') && (
          <circle
            cx={originX}
            cy={originY}
            r={16}
            role="button"
            tabIndex={answered ? -1 : 0}
            aria-label={targetLabels?.origin}
            className={`grid-target grid-target-circle ${targetStateClass('origin')} ${answered ? 'is-disabled' : ''}`}
            onClick={() => onSelectTarget?.('origin')}
            onKeyDown={(event) => handleTargetKeyDown(event, 'origin')}
          />
        )}

        {highlightOrigin && <circle cx={originX} cy={originY} r={10} className="origin-highlight" />}

        {point && (
          <g key={`point-${point.x}-${point.y}`}>
            <line
              x1={toScreenX(point.x)}
              y1={originY}
              x2={toScreenX(point.x)}
              y2={toScreenY(point.y)}
              className="point-guide"
            />
            <line
              x1={originX}
              y1={toScreenY(point.y)}
              x2={toScreenX(point.x)}
              y2={toScreenY(point.y)}
              className="point-guide"
            />
            <circle cx={toScreenX(point.x)} cy={toScreenY(point.y)} r={7} className="point-marker" />
          </g>
        )}

        {targetMarker && (
          <g>
            {targetHit && (
              <circle
                key={`target-hit-${targetHitSeed}`}
                cx={toScreenX(targetMarker.x)}
                cy={toScreenY(targetMarker.y)}
                r={14}
                className="target-hit-ring"
              />
            )}
            <text
              x={toScreenX(targetMarker.x)}
              y={toScreenY(targetMarker.y)}
              textAnchor="middle"
              dominantBaseline="central"
              className="target-marker"
            >
              🎯
            </text>
          </g>
        )}

        {attemptMarker && (
          <g transform={`translate(${toScreenX(attemptMarker.x)}, ${toScreenY(attemptMarker.y)})`}>
            <g key={`attempt-${attemptMarker.x}-${attemptMarker.y}`} className="attempt-marker">
              <circle r={11} className="attempt-marker-ring" />
              <line x1={-5} y1={-5} x2={5} y2={5} className="attempt-marker-cross" />
              <line x1={-5} y1={5} x2={5} y2={-5} className="attempt-marker-cross" />
            </g>
          </g>
        )}

        {trail.length > 1 && (
          <polyline points={trail.map((p) => `${toScreenX(p.x)},${toScreenY(p.y)}`).join(' ')} className="ship-trail" />
        )}

        {ship && (
          <g className="ship-marker" transform={`translate(${toScreenX(ship.x)}, ${toScreenY(ship.y)})`}>
            {shipArrived && <circle key={`ship-arrived-${shipArrivedSeed}`} r={14} className="target-hit-ring" />}
            <text textAnchor="middle" dominantBaseline="central" className="ship-emoji">
              🚀
            </text>
          </g>
        )}

        {onGridClick && (
          <rect
            x={0}
            y={0}
            width={VIEW_SIZE}
            height={VIEW_SIZE}
            className="grid-click-catcher"
            onClick={handleGridClick}
          />
        )}
      </svg>
    </div>
  );
}
