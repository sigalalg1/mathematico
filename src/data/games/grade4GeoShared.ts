import type { Point } from '../../types/geometry';
import type { PolygonScene } from '../../geometry/types';
import type { Geo4DifficultyId } from '../../types/geometryGrade4';
import { LABEL_POOL, buildPolygonScene, buildPolygonVertexPoints } from '../../geometry/polygonScene';
import { randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';

/**
 * Scene-building helpers shared by every Grade 4 "Learning the Language of
 * Geometry" generator — the same role `anglesGrade7Shared.ts` plays for the
 * Grade 7 Angles unit. Keeping them here is what lets five different
 * learning-group activities all guarantee the same invariants: every
 * generated polygon is simple (non-self-intersecting, see
 * `geometry/polygonScene`), orientation varies freely without ever changing
 * which answer is correct, and difficulty comes from mathematical/visual
 * complexity (rotation, irregularity, side count, distractor count) rather
 * than from clutter for its own sake.
 */

export const STAGE_CENTER: Point = { x: 160, y: 160 };
export const BASE_RADIUS = 95;

/** How freely a shape may be rotated, per difficulty — basic stays near "upright" less often than a naive implementation might assume: it still rotates, just in coarser steps, so orientation is never silently fixed. */
const ROTATION_STEP_BY_DIFFICULTY: Record<Geo4DifficultyId, number> = {
  basic: 45,
  intermediate: 10,
  advanced: 1,
};

/** How irregular (non-regular) a generated polygon's vertex spacing/radius is, per difficulty. */
const IRREGULARITY_BY_DIFFICULTY: Record<Geo4DifficultyId, { angle: number; radius: number }> = {
  basic: { angle: 0, radius: 0.08 },
  intermediate: { angle: 0.22, radius: 0.22 },
  advanced: { angle: 0.4, radius: 0.35 },
};

export function pickLabels(random: () => number, count: number): string[] {
  if (count > LABEL_POOL.length) throw new Error('pickLabels: not enough distinct letters in the pool');
  return shuffle([...LABEL_POOL], random).slice(0, count);
}

export function randomRotation(random: () => number, difficulty: Geo4DifficultyId): number {
  const step = ROTATION_STEP_BY_DIFFICULTY[difficulty];
  const steps = Math.floor(360 / step);
  return randomInt(random, 0, steps - 1) * step;
}

/**
 * Builds one closed, labeled polygon scene with `sides` vertices, varying
 * orientation and irregularity by difficulty. `center`/`radius` are
 * overridable so a gallery of several small scenes can share one generator.
 */
export function buildDifficultyPolygon(
  random: () => number,
  sides: number,
  difficulty: Geo4DifficultyId,
  options: { center?: Point; radius?: number; rotationDeg?: number; idPrefix?: string } = {},
): PolygonScene {
  const center = options.center ?? STAGE_CENTER;
  const radius = options.radius ?? BASE_RADIUS;
  const irregularity = IRREGULARITY_BY_DIFFICULTY[difficulty];
  const rotationDeg = options.rotationDeg ?? randomRotation(random, difficulty);
  const points = buildPolygonVertexPoints(center, sides, radius, {
    rotationDeg,
    angleJitterFraction: irregularity.angle,
    radiusJitterFraction: irregularity.radius,
    random,
  });
  const labels = pickLabels(random, sides);
  return buildPolygonScene(`${options.idPrefix ?? 'poly'}-${Math.round(random() * 1e6)}`, points, labels);
}

/** Builds an *open* chain (non-example of a polygon) with the same orientation/irregularity knobs. */
export function buildOpenChain(random: () => number, sides: number, difficulty: Geo4DifficultyId, options: { center?: Point; radius?: number } = {}): PolygonScene {
  const scene = buildDifficultyPolygon(random, sides, difficulty, { ...options, idPrefix: 'chain' });
  // Drop the closing side by marking the scene open; the last vertex stays as
  // a real, rendered endpoint rather than looping back to the first.
  return { ...scene, closed: false };
}

/** Canonical encoding for a "select all matching" answer: a sorted, comma-joined id set, compared by plain string equality. */
export function canonicalizeSet(ids: Iterable<string>): string {
  return [...new Set(ids)].sort().join(',');
}

export function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
