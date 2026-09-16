import { useState } from 'react';
import type { PointerEvent } from 'react';
import type { Point } from '../types/geometry';
import { classifyAngle, displayTriangleAngles, pointFromAngle, triangleSideLengths } from '../utils/geometry';

export function AngleVisual({
  angle,
  rotation = 0,
  interactive = false,
  onPointer,
  label,
}: {
  angle: number;
  rotation?: number;
  interactive?: boolean;
  onPointer?: (point: Point) => void;
  label: string;
}) {
  const vertex = { x: 100, y: 100 };
  const fixed = pointFromAngle(vertex, rotation, 72);
  const moving = pointFromAngle(vertex, rotation + angle, 72);
  const arcStart = pointFromAngle(vertex, rotation, 29);
  const arcEnd = pointFromAngle(vertex, rotation + angle, 29);
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <svg
      className={`geo-angle geo-angle-${classifyAngle(angle)}`}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label}
      style={{ direction: 'ltr' }}
      onPointerDown={interactive && onPointer ? (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onPointer({ x: ((event.clientX - rect.left) / rect.width) * 200, y: ((event.clientY - rect.top) / rect.height) * 200 });
      } : undefined}
      onPointerMove={interactive && onPointer ? (event) => {
        if (event.buttons !== 1) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onPointer({ x: ((event.clientX - rect.left) / rect.width) * 200, y: ((event.clientY - rect.top) / rect.height) * 200 });
      } : undefined}
      data-testid="geometry-angle"
    >
      <path className="geo-angle-opening" d={`M ${arcStart.x} ${arcStart.y} A 29 29 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`} />
      <line className="geo-ray" x1="100" y1="100" x2={fixed.x} y2={fixed.y} />
      <line className="geo-ray geo-ray-moving" x1="100" y1="100" x2={moving.x} y2={moving.y} />
      <circle className="geo-vertex" cx="100" cy="100" r="5" />
      {interactive && <circle className="geo-handle" cx={moving.x} cy={moving.y} r="12" />}
      {classifyAngle(angle) === 'right' && <path className="geo-right-mark" d={rightMarker(rotation)} />}
    </svg>
  );
}

function rightMarker(rotation: number): string {
  const vertex = { x: 100, y: 100 };
  const a = pointFromAngle(vertex, rotation, 19);
  const b = pointFromAngle(a, rotation + 90, 19);
  const c = pointFromAngle(vertex, rotation + 90, 19);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`;
}

export function TriangleVisual({
  points,
  label,
  interactive = false,
  onVertexPointer,
  measures = 'both',
}: {
  points: [Point, Point, Point];
  label: string;
  interactive?: boolean;
  onVertexPointer?: (index: number, point: Point) => void;
  /**
   * Which labels to print. Activities that classify by angles show only angles
   * and those that classify by sides show only side lengths, so no number on
   * screen is beside the point of the question being asked.
   */
  measures?: 'both' | 'angles' | 'sides' | 'none';
}) {
  const [draggedVertex, setDraggedVertex] = useState<number | null>(null);
  const showAngles = measures === 'both' || measures === 'angles';
  const showSides = measures === 'both' || measures === 'sides';
  const angles = displayTriangleAngles(points);
  const sides = triangleSideLengths(points);
  function eventPoint(event: PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
  }
  return (
    <svg
      className="geo-triangle"
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      style={{ direction: 'ltr' }}
      data-testid="geometry-triangle"
      onPointerMove={interactive && onVertexPointer ? (event) => {
        if (draggedVertex !== null) onVertexPointer(draggedVertex, eventPoint(event));
      } : undefined}
      onPointerUp={() => setDraggedVertex(null)}
      onPointerCancel={() => setDraggedVertex(null)}
    >
      <polygon points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
      {points.map((point, index) => (
        <g key={index}>
          <circle
            className={`geo-triangle-vertex${interactive ? ' is-interactive' : ''}`}
            cx={point.x}
            cy={point.y}
            r={interactive ? 5 : 3.5}
            data-testid={`triangle-vertex-${index}`}
            onPointerDown={interactive && onVertexPointer ? (event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggedVertex(index);
            } : undefined}
          />
          {showAngles && <text x={point.x} y={point.y - 7}>{angles[index]}°</text>}
        </g>
      ))}
      {showSides && sides.map((side, index) => {
        const a = points[(index + 1) % 3];
        const b = points[(index + 2) % 3];
        return <text key={`side-${index}`} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2}>{Math.round(side)}</text>;
      })}
    </svg>
  );
}

