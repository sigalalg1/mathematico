import type { ReactNode } from 'react';
import type { LabeledTriangle } from '../../geometry/types';
import type { GeometryStyleTokens } from '../../geometry/style';
import { classifyAngle7 } from '../../geometry/angleMath';
import { interiorAngleAt } from '../../geometry/polygon';
import { GeometryStage } from './GeometryStage';
import { GeoAngleArc, GeoPoint, GeoPolygon, GeoSegment } from './GeometryPrimitives';

/**
 * Renders a labeled triangle with one interior angle optionally highlighted —
 * the light Skill-E enrichment (naming an interior angle), reusing the same
 * `GeoAngleArc`/`GeoPoint` primitives every other Grade 7 Angles exercise
 * uses rather than a one-off triangle drawing.
 */
export function TriangleSceneView({
  triangle,
  style,
  label,
  highlightedVertexIndex,
  angleLabel,
  className,
}: {
  triangle: LabeledTriangle;
  style: GeometryStyleTokens;
  label: string;
  highlightedVertexIndex?: 0 | 1 | 2;
  angleLabel?: ReactNode;
  className?: string;
}) {
  const points = triangle.vertices.map((v) => v.point);

  return (
    <GeometryStage style={style} label={label} className={className}>
      <GeoPolygon points={points} style={style} />
      {[0, 1, 2].map((i) => {
        const a = points[i];
        const b = points[(i + 1) % 3];
        return <GeoSegment key={`edge-${i}`} a={a} b={b} style={style} />;
      })}

      {highlightedVertexIndex !== undefined &&
        (() => {
          const vertex = triangle.vertices[highlightedVertexIndex];
          const others = triangle.vertices.filter((_, i) => i !== highlightedVertexIndex);
          const degrees = interiorAngleAt(triangle, highlightedVertexIndex);
          return (
            <GeoAngleArc
              vertex={vertex.point}
              fromThrough={others[0].point}
              toThrough={others[1].point}
              style={style}
              type={classifyAngle7(degrees)}
              colorIndex={0}
              radiusIndex={0}
              label={angleLabel}
              testId="geo-triangle-interior-angle"
            />
          );
        })()}

      {triangle.vertices.map((vertex, i) => {
        const centroid = { x: (points[0].x + points[1].x + points[2].x) / 3, y: (points[0].y + points[1].y + points[2].y) / 3 };
        const outwardAngle = (Math.atan2(vertex.point.y - centroid.y, vertex.point.x - centroid.x) * 180) / Math.PI;
        return <GeoPoint key={vertex.id ?? i} point={vertex.point} label={vertex.label} style={style} emphasis="vertex" labelAngleDeg={outwardAngle} />;
      })}
    </GeometryStage>
  );
}
