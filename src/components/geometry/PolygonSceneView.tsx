import type { ReactNode } from 'react';
import type { PolygonScene } from '../../geometry/types';
import type { GeometryStyleTokens } from '../../geometry/style';
import { sideEndpoints, sideMidpoint } from '../../geometry/polygonScene';
import { GeometryStage } from './GeometryStage';
import {
  GeoAreaFill,
  GeoCurvedChain,
  GeoHandle,
  GeoOpenChain,
  GeoParallelTicks,
  GeoPerimeterTrace,
  GeoPoint,
  GeoPolygon,
  GeoSegment,
} from './GeometryPrimitives';

/**
 * The one shared renderer behind every "a labeled polygon (or deliberate
 * non-example shape)" exercise in the Grade 4 "Learning the Language of
 * Geometry" unit: draws the shape itself (closed/open/curved), optional
 * vertex/side labels, any number of highlighted diagonals or parallel marks,
 * an optional area fill or perimeter trace, and clickable overlays on
 * specific vertices or sides. Every Grade 4 geometry-foundations page
 * composes this one component rather than hand-rolling its own polygon SVG —
 * the same "shared scene renderer" pattern `VertexSceneView` already
 * established for the Grade 7 Angles unit.
 */

export interface VertexHandleSpec {
  /** Index into `scene.vertices`. */
  index: number;
  ariaLabel: string;
  selected?: boolean;
  onClick: () => void;
}

export interface SideHandleSpec {
  /** Side index (see `geometry/polygonScene`'s side-index convention). */
  index: number;
  ariaLabel: string;
  selected?: boolean;
  onClick: () => void;
}

export interface DiagonalSpec {
  id: string;
  /** Vertex indices the diagonal (or any highlighted segment) connects. */
  a: number;
  b: number;
  color?: string;
  dashed?: boolean;
}

export interface ParallelMarkSpec {
  /** Side index to mark. */
  sideIndex: number;
  /** Tick count — give the same count to the two sides being claimed parallel. */
  count: number;
  color?: string;
}

interface PolygonSceneViewProps {
  scene: PolygonScene;
  style: GeometryStyleTokens;
  label: string;
  showVertexLabels?: boolean;
  vertexHandles?: VertexHandleSpec[];
  sideHandles?: SideHandleSpec[];
  diagonals?: DiagonalSpec[];
  parallelMarks?: ParallelMarkSpec[];
  /** Highlights a side with a right-angle-style accent color (used for the perpendicular-sides concept). */
  highlightedSideIndices?: number[];
  showAreaFill?: boolean;
  showPerimeterTrace?: boolean;
  perimeterAnimated?: boolean;
  fillShape?: boolean;
  children?: ReactNode;
  className?: string;
}

export function PolygonSceneView({
  scene,
  style,
  label,
  showVertexLabels = true,
  vertexHandles = [],
  sideHandles = [],
  diagonals = [],
  parallelMarks = [],
  highlightedSideIndices = [],
  showAreaFill = false,
  showPerimeterTrace = false,
  perimeterAnimated = false,
  fillShape = true,
  children,
  className,
}: PolygonSceneViewProps) {
  const interactive = vertexHandles.length > 0 || sideHandles.length > 0;
  const points = scene.vertices.map((v) => v.point);

  return (
    <GeometryStage style={style} label={label} interactive={interactive} className={className}>
      {showAreaFill && <GeoAreaFill points={points} style={style} />}

      {scene.curved ? (
        <GeoCurvedChain points={points} style={style} closed={scene.closed} fill={fillShape && scene.closed} />
      ) : scene.closed ? (
        <GeoPolygon points={points} style={style} fill={fillShape} />
      ) : (
        <GeoOpenChain points={points} style={style} />
      )}

      {!scene.curved &&
        highlightedSideIndices.map((sideIndex) => {
          const [a, b] = sideEndpoints(scene, sideIndex);
          return <GeoSegment key={`hl-${sideIndex}`} a={a} b={b} style={style} color={style.colors.handleActive} />;
        })}

      {showPerimeterTrace && <GeoPerimeterTrace points={points} style={style} closed={scene.closed} animated={perimeterAnimated} />}

      {parallelMarks.map((mark, i) => {
        const [a, b] = sideEndpoints(scene, mark.sideIndex);
        return <GeoParallelTicks key={`pm-${mark.sideIndex}-${i}`} a={a} b={b} style={style} count={mark.count} color={mark.color} />;
      })}

      {diagonals.map((d) => (
        <GeoSegment key={d.id} a={scene.vertices[d.a].point} b={scene.vertices[d.b].point} style={style} color={d.color ?? style.colors.handleActive} dashed={d.dashed} />
      ))}

      {showVertexLabels &&
        scene.vertices.map((vertex) => {
          const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }), { x: 0, y: 0 });
          const outwardAngle = (Math.atan2(vertex.point.y - centroid.y, vertex.point.x - centroid.x) * 180) / Math.PI;
          return <GeoPoint key={vertex.id} point={vertex.point} label={vertex.label} style={style} emphasis="vertex" labelAngleDeg={outwardAngle} />;
        })}

      {sideHandles.map((handle) => {
        const point = sideMidpoint(scene, handle.index);
        return (
          <GeoHandle
            key={`side-${handle.index}`}
            point={point}
            style={style}
            ariaLabel={handle.ariaLabel}
            selected={handle.selected}
            onClick={handle.onClick}
            testId={`geo-side-handle-${handle.index}`}
          />
        );
      })}

      {vertexHandles.map((handle) => (
        <GeoHandle
          key={`vertex-${handle.index}`}
          point={scene.vertices[handle.index].point}
          style={style}
          ariaLabel={handle.ariaLabel}
          selected={handle.selected}
          onClick={handle.onClick}
          testId={`geo-vertex-handle-${handle.index}`}
        />
      ))}

      {children}
    </GeometryStage>
  );
}
