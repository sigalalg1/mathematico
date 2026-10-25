import type { Point } from '../types/geometry';
import { angleFromVertex, distance, normalizeDegrees, pointFromAngle, rotatePoint } from '../utils/geometry';
import type { AngleRef, AngleType7, ResolvedAngle, VertexScene } from './types';

// Re-exported rather than duplicated: these primitives are grade-agnostic and
// already covered by `utils/geometry`'s own tests.
export { angleFromVertex, distance, normalizeDegrees, pointFromAngle, rotatePoint };

export const RIGHT_ANGLE_TOLERANCE_DEG = 0.5;
export const STRAIGHT_ANGLE_TOLERANCE_DEG = 0.5;
export const ZERO_ANGLE_TOLERANCE_DEG = 0.5;

/**
 * Mandatory QA safety margin (see mission brief): a previous version of this
 * app had angles near 90° that were visually indistinguishable from a true
 * right angle because strokes were too thick. An angle a child must classify
 * *by eye* as acute/right/obtuse/straight must sit at least this many degrees
 * away from every other boundary (0°, 90°, 180°), unless the question is
 * deliberately testing that exact boundary (an exact right or straight
 * angle). Generators must enforce this programmatically, not by eyeballing.
 */
export const CLASSIFICATION_SAFETY_MARGIN_DEG = 12;

/** Normalizes a raw signed/overflowing angle measure to the [0, 180] range an angle between two rays always has. */
export function normalizeAngleMeasure(degrees: number): number {
  const wrapped = Math.abs(degrees) % 360;
  return wrapped > 180 ? 360 - wrapped : wrapped;
}

/** Classifies an angle into the four Grade 7 types (chapter 20). */
export function classifyAngle7(degrees: number, tolerance = RIGHT_ANGLE_TOLERANCE_DEG): AngleType7 {
  const measure = normalizeAngleMeasure(degrees);
  if (Math.abs(measure - 180) <= tolerance) return 'straight';
  if (Math.abs(measure - 90) <= tolerance) return 'right';
  return measure < 90 ? 'acute' : 'obtuse';
}

/**
 * Whether `degrees` is far enough from every classification boundary (0°,
 * 90°, 180°) that a child can classify it by eye without the answer coming
 * down to a pixel-measuring exercise. An angle that is deliberately placed
 * *exactly* on a boundary (within tolerance — i.e. a true right or straight
 * angle) is always considered safe, since that is the point being tested.
 */
export function isUnambiguouslyClassifiable(degrees: number, margin = CLASSIFICATION_SAFETY_MARGIN_DEG): boolean {
  const measure = normalizeAngleMeasure(degrees);
  const isExactRight = Math.abs(measure - 90) <= RIGHT_ANGLE_TOLERANCE_DEG;
  const isExactStraight = Math.abs(measure - 180) <= STRAIGHT_ANGLE_TOLERANCE_DEG;
  const isExactZero = measure <= ZERO_ANGLE_TOLERANCE_DEG;
  if (isExactRight || isExactStraight || isExactZero) return true;
  return (
    Math.abs(measure - 90) >= margin &&
    measure >= margin &&
    180 - measure >= margin
  );
}

/** The real angle at `vertex` between the directions toward `a` and toward `b`, always in [0, 180]. */
export function angleBetweenRays(vertex: Point, a: Point, b: Point): number {
  return angleFromVertex(a, vertex, b);
}

/** The compass-style heading (degrees) from `vertex` toward `through` — the direction a ray is drawn in. */
export function directionDegrees(vertex: Point, through: Point): number {
  return (Math.atan2(through.y - vertex.y, through.x - vertex.x) * 180) / Math.PI;
}

/**
 * The point a ray's drawn endpoint sits at once rendered at a fixed on-screen
 * `length` — i.e. same direction as `through`, but never `through`'s own
 * (randomized, meaningless) distance. Generators use this so a diagram's
 * clickable hit-targets line up with exactly what the renderer draws.
 */
export function rayEndpoint(vertex: Point, through: Point, length: number): Point {
  return pointFromAngle(vertex, directionDegrees(vertex, through), length);
}

/** Resolves every pair of distinct rays in a `VertexScene` into named, measured angles. */
export function allAnglesInScene(scene: VertexScene): ResolvedAngle[] {
  const result: ResolvedAngle[] = [];
  for (let i = 0; i < scene.rays.length; i += 1) {
    for (let j = i + 1; j < scene.rays.length; j += 1) {
      result.push(resolveAngle(scene, { vertexId: scene.vertex.id, rayAId: scene.rays[i].id, rayBId: scene.rays[j].id }));
    }
  }
  return result;
}

export function resolveAngle(scene: VertexScene, ref: AngleRef): ResolvedAngle {
  const rayA = scene.rays.find((ray) => ray.id === ref.rayAId);
  const rayB = scene.rays.find((ray) => ref.rayBId === ray.id);
  if (!rayA || !rayB) throw new Error(`resolveAngle: unknown ray id in scene "${scene.vertex.id}"`);
  const degrees = angleBetweenRays(scene.vertex.point, rayA.through, rayB.through);
  return { vertex: scene.vertex, rayA, rayB, degrees, type: classifyAngle7(degrees) };
}

/**
 * Whether ray `mid` lies strictly between rays `a` and `b` as drawn (i.e.
 * `angle(a, mid) + angle(mid, b) === angle(a, b)`), the betweenness notion
 * chapter 21 uses to justify that ∠BAD = ∠BAC + ∠CAD. Pure angle-ordering
 * math — no drawing required.
 */
export function isRayBetween(vertex: Point, a: Point, mid: Point, b: Point): boolean {
  const whole = angleBetweenRays(vertex, a, b);
  const first = angleBetweenRays(vertex, a, mid);
  const second = angleBetweenRays(vertex, mid, b);
  return Math.abs(first + second - whole) <= 1e-6;
}

/** Rotates every ray direction (and relabels nothing) of a scene around its vertex — used to vary orientation without changing any angle measure. */
export function rotateScene(scene: VertexScene, degrees: number): VertexScene {
  return {
    vertex: scene.vertex,
    rays: scene.rays.map((ray) => ({ ...ray, through: rotatePoint(ray.through, degrees, scene.vertex.point) })),
  };
}

/** Mirrors every ray direction of a scene across the vertical line through the vertex — used to vary orientation without changing any angle measure. */
export function mirrorScene(scene: VertexScene): VertexScene {
  const { x: vx, y: vy } = scene.vertex.point;
  return {
    vertex: scene.vertex,
    rays: scene.rays.map((ray) => ({ ...ray, through: { x: vx - (ray.through.x - vx), y: vy + (ray.through.y - vy) } })),
  };
}
