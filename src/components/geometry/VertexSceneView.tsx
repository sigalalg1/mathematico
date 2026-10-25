import type { ReactNode } from 'react';
import type { AngleRef, VertexScene } from '../../geometry/types';
import type { GeometryStyleTokens } from '../../geometry/style';
import { directionDegrees, rayEndpoint, resolveAngle } from '../../geometry/angleMath';
import { GeometryStage } from './GeometryStage';
import { GeoAngleArc, GeoHandle, GeoPoint, GeoRay } from './GeometryPrimitives';

/**
 * The one shared renderer behind every "rays fan out from a vertex" exercise
 * in the Grade 7 Angles unit (identify, classify, notation, compare): draws
 * the rays, the vertex + arm labels, any number of highlighted angle arcs,
 * and optional clickable overlays on specific points or angles. Every Grade
 * 7 Angles page composes this one component rather than hand-rolling its own
 * SVG — exactly the "reuse shared primitives" the mission brief asks for.
 */

export interface AngleArcSpec {
  id: string;
  ref: AngleRef;
  colorIndex?: number;
  radiusIndex?: number;
  label?: ReactNode;
  /** See `GeoAngleArc`'s `filled` prop — shades the angle as a wedge so its size reads unambiguously even near 180°. */
  filled?: boolean;
}

export interface PointHandleSpec {
  id: string;
  ariaLabel: string;
  selected?: boolean;
  onClick: () => void;
}

export interface AngleHandleSpec {
  id: string;
  ref: AngleRef;
  radiusIndex?: number;
  ariaLabel: string;
  selected?: boolean;
  onClick: () => void;
}

interface VertexSceneViewProps {
  scene: VertexScene;
  style: GeometryStyleTokens;
  label: string;
  grid?: boolean;
  angles?: AngleArcSpec[];
  clickablePoints?: PointHandleSpec[];
  clickableAngles?: AngleHandleSpec[];
  showRayLabels?: boolean;
  showVertexLabel?: boolean;
  className?: string;
}

function pointForRay(scene: VertexScene, rayId: string, style: GeometryStyleTokens) {
  if (rayId === 'vertex') return scene.vertex.point;
  const ray = scene.rays.find((candidate) => candidate.id === rayId);
  if (!ray) throw new Error(`VertexSceneView: unknown ray id "${rayId}"`);
  return rayEndpoint(scene.vertex.point, ray.through, style.rayLength);
}

export function VertexSceneView({
  scene,
  style,
  label,
  grid,
  angles = [],
  clickablePoints = [],
  clickableAngles = [],
  showRayLabels = true,
  showVertexLabel = true,
  className,
}: VertexSceneViewProps) {
  const interactive = clickablePoints.length > 0 || clickableAngles.length > 0;

  // The vertex label is pushed opposite the "average" direction of every ray,
  // so it never sits on top of a drawn ray.
  const averageRayDeg =
    scene.rays.reduce((sum, ray) => sum + directionDegrees(scene.vertex.point, ray.through), 0) / Math.max(1, scene.rays.length);
  const vertexLabelAngle = averageRayDeg + 180;

  return (
    <GeometryStage style={style} label={label} grid={grid} interactive={interactive} className={className}>
      {scene.rays.map((ray) => (
        <GeoRay key={ray.id} vertex={scene.vertex.point} through={ray.through} style={style} testId={`geo-ray-${ray.id}`} />
      ))}

      {angles.map((angle, index) => {
        const resolved = resolveAngle(scene, angle.ref);
        return (
          <GeoAngleArc
            key={angle.id}
            vertex={scene.vertex.point}
            fromThrough={resolved.rayA.through}
            toThrough={resolved.rayB.through}
            style={style}
            type={resolved.type}
            colorIndex={angle.colorIndex ?? index}
            radiusIndex={angle.radiusIndex ?? index}
            label={angle.label}
            testId={`geo-angle-${angle.id}`}
            filled={angle.filled}
          />
        );
      })}

      {showRayLabels &&
        scene.rays.map((ray) => {
          const endpoint = rayEndpoint(scene.vertex.point, ray.through, style.rayLength);
          const labelAngle = directionDegrees(scene.vertex.point, ray.through);
          return <GeoPoint key={`label-${ray.id}`} point={endpoint} label={ray.label} style={style} emphasis="point" labelAngleDeg={labelAngle} />;
        })}

      {showVertexLabel && (
        <GeoPoint point={scene.vertex.point} label={scene.vertex.label} style={style} emphasis="vertex" labelAngleDeg={vertexLabelAngle} />
      )}

      {clickablePoints.map((handle) => (
        <GeoHandle
          key={handle.id}
          point={pointForRay(scene, handle.id, style)}
          style={style}
          ariaLabel={handle.ariaLabel}
          selected={handle.selected}
          onClick={handle.onClick}
          testId={`geo-point-handle-${handle.id}`}
        />
      ))}

      {clickableAngles.map((handle, index) => {
        const resolved = resolveAngle(scene, handle.ref);
        const radius = style.arcBaseRadius + (handle.radiusIndex ?? index) * style.arcStep;
        const startDeg = directionDegrees(scene.vertex.point, resolved.rayA.through);
        const rawSweep = (((directionDegrees(scene.vertex.point, resolved.rayB.through) - startDeg) % 360) + 360) % 360;
        const endDeg = rawSweep > 180 ? startDeg - (360 - rawSweep) : startDeg + rawSweep;
        const midDeg = (startDeg + endDeg) / 2;
        const bisector = {
          x: scene.vertex.point.x + Math.cos((midDeg * Math.PI) / 180) * radius,
          y: scene.vertex.point.y + Math.sin((midDeg * Math.PI) / 180) * radius,
        };
        return (
          <GeoHandle
            key={handle.id}
            point={bisector}
            style={style}
            ariaLabel={handle.ariaLabel}
            selected={handle.selected}
            onClick={handle.onClick}
            testId={`geo-angle-handle-${handle.id}`}
          />
        );
      })}
    </GeometryStage>
  );
}
