import type { Point } from '../types/geometry';
import { directionDegrees, normalizeDegrees, pointFromAngle } from './angleMath';
import type { PolygonScene } from './types';

/**
 * The reusable polygon-building math behind the Grade 4 "Learning the
 * Language of Geometry" unit (points, segments, polygons, diagonals,
 * parallel/perpendicular sides, the polygon-family names). Grade-agnostic,
 * same spirit as `angleMath`/`polygon`: nothing here is Grade-4-specific, so
 * a later Grade 4 (or any grade's) polygon-properties unit can reuse it
 * directly rather than re-deriving this math.
 */

export const LABEL_POOL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

/**
 * Vertices of a "star-shaped" polygon around `center`: angles are visited in
 * strictly increasing order (mod 360), so the result is always simple
 * (non-self-intersecting) regardless of how irregular the per-vertex radius
 * is — a polygon is simple whenever every vertex is visible from a common
 * interior point in increasing angular order, which this construction
 * guarantees by design. This is what lets generators vary orientation and
 * irregularity freely (the mission brief's explicit requirement) without a
 * separate self-intersection check.
 */
export function buildPolygonVertexPoints(
  center: Point,
  sideCount: number,
  baseRadius: number,
  options: {
    rotationDeg?: number;
    /** Per-vertex angular jitter as a fraction of the even spacing (0 = perfectly regular spacing). Kept < 0.5 by callers so angular order never inverts. */
    angleJitterFraction?: number;
    /** Per-vertex radius jitter as a fraction of `baseRadius` (0 = perfectly regular/equilateral). */
    radiusJitterFraction?: number;
    random?: () => number;
  } = {},
): Point[] {
  if (sideCount < 3) throw new Error('buildPolygonVertexPoints: a polygon needs at least 3 sides');
  const { rotationDeg = 0, angleJitterFraction = 0, radiusJitterFraction = 0, random = Math.random } = options;
  const step = 360 / sideCount;
  const jitterCap = step * 0.45; // keeps angular order intact even at the max jitter fraction
  return Array.from({ length: sideCount }, (_, i) => {
    const angleJitter = (random() * 2 - 1) * Math.min(angleJitterFraction, 1) * jitterCap;
    const angle = normalizeDegrees(rotationDeg + i * step + angleJitter);
    const radiusJitter = 1 + (random() * 2 - 1) * Math.min(radiusJitterFraction, 0.9);
    return pointFromAngle(center, angle, baseRadius * radiusJitter);
  });
}

/** Builds a closed, labeled `PolygonScene` from vertex points in order. */
export function buildPolygonScene(id: string, points: Point[], labels: readonly string[]): PolygonScene {
  if (points.length !== labels.length) throw new Error('buildPolygonScene: points and labels must have the same length');
  return {
    id,
    closed: true,
    vertices: points.map((point, i) => ({ id: `v${i}`, label: labels[i], point })),
  };
}

/** The number of sides a scene has: equal to its vertex count when closed, one fewer when open (a chain of N points has N-1 segments). */
export function sideCount(scene: PolygonScene): number {
  return scene.closed ? scene.vertices.length : Math.max(0, scene.vertices.length - 1);
}

/** The two vertex indices bounding side `i` (0-based), wrapping only for a closed scene. */
export function sideVertexIndices(scene: PolygonScene, sideIndex: number): [number, number] {
  const n = scene.vertices.length;
  const a = sideIndex;
  const b = scene.closed ? (sideIndex + 1) % n : sideIndex + 1;
  return [a, b];
}

export function sideEndpoints(scene: PolygonScene, sideIndex: number): [Point, Point] {
  const [a, b] = sideVertexIndices(scene, sideIndex);
  return [scene.vertices[a].point, scene.vertices[b].point];
}

export function sideMidpoint(scene: PolygonScene, sideIndex: number): Point {
  const [a, b] = sideEndpoints(scene, sideIndex);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Whether two distinct vertex indices of a *closed* polygon are adjacent
 * (share a side). Always false for an open scene — adjacency there is just
 * "consecutive in the chain," which callers needing that can check directly
 * via `Math.abs(i - j) === 1`, since the open-chain case never needs a
 * diagonal notion at all.
 */
export function isAdjacentVertexPair(scene: PolygonScene, i: number, j: number): boolean {
  if (i === j) return false;
  const n = scene.vertices.length;
  const diff = Math.abs(i - j);
  return diff === 1 || diff === n - 1;
}

/**
 * The textbook definition this unit must enforce precisely: a diagonal
 * connects two *non-adjacent* vertices of a closed polygon. A triangle (every
 * pair of vertices is adjacent) has none. This is the single source of truth
 * every "is this a diagonal?" check in the unit calls, rather than letting
 * any validator silently treat "any segment inside the shape" as a diagonal.
 */
export function isDiagonalPair(scene: PolygonScene, i: number, j: number): boolean {
  if (!scene.closed) return false;
  if (i === j) return false;
  if (scene.vertices.length < 4) return false;
  return !isAdjacentVertexPair(scene, i, j);
}

/** Every valid diagonal as a vertex-index pair `[i, j]` with `i < j`. */
export function allDiagonalPairs(scene: PolygonScene): [number, number][] {
  const n = scene.vertices.length;
  const result: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (isDiagonalPair(scene, i, j)) result.push([i, j]);
    }
  }
  return result;
}

/** Every pair of side indices that shares a vertex (i.e. are adjacent sides). */
export function adjacentSideIndexPairs(scene: PolygonScene): [number, number][] {
  const n = sideCount(scene);
  const result: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const next = scene.closed ? (i + 1) % n : i + 1;
    if (next < n) result.push([i, next]);
  }
  return result;
}

/** Opposite side pairs of a quadrilateral (sides that share no vertex): (0,2) and (1,3). `null` for any other side count. */
export function oppositeSideIndexPairsForQuad(scene: PolygonScene): [number, number][] | null {
  if (!scene.closed || scene.vertices.length !== 4) return null;
  return [
    [0, 2],
    [1, 3],
  ];
}

const POLYGON_FAMILY_BY_SIDE_COUNT: Record<number, string> = {
  3: 'triangle',
  4: 'quadrilateral',
  5: 'pentagon',
  6: 'hexagon',
  7: 'heptagon',
  8: 'octagon',
};

/** The i18n-key suffix for a polygon's family name, keyed purely by side count (chapter requirement: the name depends on the side count). */
export function polygonFamilyKey(n: number): string {
  return POLYGON_FAMILY_BY_SIDE_COUNT[n] ?? `polygon-${n}`;
}

/** The direction (deg) of a segment, reusing the angle engine's own heading convention. */
export function segmentDirectionDeg(a: Point, b: Point): number {
  return directionDegrees(a, b);
}

/** Two segments are parallel when their directions agree up to a 180° flip (a line has no "forward"), within `toleranceDeg`. */
export function segmentsAreParallel(a: Point, b: Point, c: Point, d: Point, toleranceDeg = 6): boolean {
  const d1 = normalizeDegrees(segmentDirectionDeg(a, b)) % 180;
  const d2 = normalizeDegrees(segmentDirectionDeg(c, d)) % 180;
  const diff = Math.min(Math.abs(d1 - d2), 180 - Math.abs(d1 - d2));
  return diff <= toleranceDeg;
}

/** Two segments are perpendicular when their directions differ by ~90° (mod 180), within `toleranceDeg`. */
export function segmentsArePerpendicular(a: Point, b: Point, c: Point, d: Point, toleranceDeg = 6): boolean {
  const d1 = normalizeDegrees(segmentDirectionDeg(a, b)) % 180;
  const d2 = normalizeDegrees(segmentDirectionDeg(c, d)) % 180;
  const diff = Math.min(Math.abs(d1 - d2), 180 - Math.abs(d1 - d2));
  return Math.abs(diff - 90) <= toleranceDeg;
}

// --- Named quadrilateral builders (Group 4 — recognition vocabulary only) --
//
// Each builder returns 4 points, centered at `center` and rotated by
// `rotationDeg` — so "a square drawn at 37°" is exactly as easy to generate
// as one drawn flat, which is the point: the mission brief explicitly
// requires genuinely rotated/varied examples so a child never silently
// learns "a square is a shape drawn level." Callers (the Group 4 generator)
// are responsible for picking parameters far enough apart that two named
// families can never be mistaken for each other (e.g. a rectangle's two
// side lengths differ by a real margin, never close enough to read as a
// square) — the `isXShape` classifiers below exist so generators and tests
// can both verify that unambiguously, rather than trusting hand-picked
// constants alone.

function rotateAround(point: Point, center: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function finishQuad(center: Point, local: Point[], rotationDeg: number): Point[] {
  return local.map((p) => rotateAround({ x: center.x + p.x, y: center.y + p.y }, center, rotationDeg));
}

export function buildSquareVertices(center: Point, size: number, rotationDeg = 0): Point[] {
  const h = size / 2;
  return finishQuad(center, [{ x: -h, y: -h }, { x: h, y: -h }, { x: h, y: h }, { x: -h, y: h }], rotationDeg);
}

export function buildRectangleVertices(center: Point, width: number, height: number, rotationDeg = 0): Point[] {
  const w = width / 2;
  const h = height / 2;
  return finishQuad(center, [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }], rotationDeg);
}

/** A rhombus via its two (unequal) diagonals, which are always perpendicular bisectors of each other — guaranteeing four equal sides by construction. */
export function buildRhombusVertices(center: Point, diagonalA: number, diagonalB: number, rotationDeg = 0): Point[] {
  const a = diagonalA / 2;
  const b = diagonalB / 2;
  return finishQuad(center, [{ x: 0, y: -b }, { x: a, y: 0 }, { x: 0, y: b }, { x: -a, y: 0 }], rotationDeg);
}

/** A (non-rectangular) parallelogram: a rectangle sheared by `skew` along its top/bottom edge. */
export function buildParallelogramVertices(center: Point, halfWidth: number, halfHeight: number, skew: number, rotationDeg = 0): Point[] {
  return finishQuad(
    center,
    [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth + skew, y: halfHeight },
      { x: -halfWidth + skew, y: halfHeight },
    ],
    rotationDeg,
  );
}

/** An isosceles trapezoid: parallel top/bottom sides of different widths, non-parallel legs. */
export function buildTrapezoidVertices(center: Point, topWidth: number, bottomWidth: number, height: number, rotationDeg = 0): Point[] {
  const t = topWidth / 2;
  const b = bottomWidth / 2;
  const h = height / 2;
  return finishQuad(center, [{ x: -t, y: -h }, { x: t, y: -h }, { x: b, y: h }, { x: -b, y: h }], rotationDeg);
}

function quadSideLengths(points: Point[]): [number, number, number, number] {
  const len = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
  return [len(points[0], points[1]), len(points[1], points[2]), len(points[2], points[3]), len(points[3], points[0])];
}

/** Whether every side of a quadrilateral's 4 points is a right angle (within tolerance) — rectangle/square test. */
export function isRectangleShape(points: [Point, Point, Point, Point], toleranceDeg = 3): boolean {
  for (let i = 0; i < 4; i += 1) {
    const prev = points[(i + 3) % 4];
    const curr = points[i];
    const next = points[(i + 1) % 4];
    if (!segmentsArePerpendicular(prev, curr, curr, next, toleranceDeg)) return false;
  }
  return true;
}

/** Whether all 4 sides are equal length (within a relative tolerance) — rhombus/square test. */
export function isRhombusShape(points: [Point, Point, Point, Point], relTolerance = 0.03): boolean {
  const [s0, s1, s2, s3] = quadSideLengths(points);
  const avg = (s0 + s1 + s2 + s3) / 4;
  return [s0, s1, s2, s3].every((s) => Math.abs(s - avg) / avg <= relTolerance);
}

/** A parallelogram: both pairs of opposite sides are parallel. */
export function isParallelogramShape(points: [Point, Point, Point, Point], toleranceDeg = 4): boolean {
  return segmentsAreParallel(points[0], points[1], points[2], points[3], toleranceDeg) && segmentsAreParallel(points[1], points[2], points[3], points[0], toleranceDeg);
}

/** Exactly one pair of opposite sides parallel (the trapezoid definition used here), and not a parallelogram. */
export function isTrapezoidShape(points: [Point, Point, Point, Point], toleranceDeg = 4): boolean {
  const pair1 = segmentsAreParallel(points[0], points[1], points[2], points[3], toleranceDeg);
  const pair2 = segmentsAreParallel(points[1], points[2], points[3], points[0], toleranceDeg);
  return (pair1 || pair2) && !(pair1 && pair2);
}
