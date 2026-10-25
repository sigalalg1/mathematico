import type { Point } from '../../types/geometry';
import type { RaySpec, VertexScene } from '../../geometry/types';
import type { AnglesDifficultyId } from '../../types/anglesGrade7';
import { normalizeDegrees, pointFromAngle } from '../../geometry/angleMath';
import { randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';

/**
 * Scene-building helpers shared by every Grade 7 Angles generator. Keeping
 * them here (rather than duplicated per activity file) is what lets five very
 * different exercise types all guarantee the same mathematical invariants:
 * every diagram is built from real coordinates, rotation/mirroring never
 * changes an angle's measure, and ray *length* is randomized on purpose to
 * prove it can never leak as a visual cue (the renderer always draws every
 * ray at one fixed on-screen length regardless of this).
 */

export const STAGE_CENTER: Point = { x: 160, y: 160 };
export const LABEL_POOL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

/** How free the orientation is allowed to be, per difficulty — rotation is one of the brief's named reasoning-load knobs. */
export const ROTATION_STEP_BY_DIFFICULTY: Record<AnglesDifficultyId, number> = {
  basic: 90,
  intermediate: 15,
  advanced: 1,
};

export function pickLabels(random: () => number, count: number, exclude: readonly string[] = []): string[] {
  const pool = LABEL_POOL.filter((letter) => !exclude.includes(letter));
  if (count > pool.length) throw new Error('pickLabels: not enough distinct letters in the pool');
  return shuffle([...pool], random).slice(0, count);
}

export function randomBaseRotation(random: () => number, difficulty: AnglesDifficultyId): number {
  const step = ROTATION_STEP_BY_DIFFICULTY[difficulty];
  const steps = Math.floor(360 / step);
  return randomInt(random, 0, steps - 1) * step;
}

/**
 * Builds one vertex with N rays at the given *relative* degrees (before
 * rotation), each toward a labeled point. `baseRotationDeg` rotates every ray
 * together without changing any angle between them — the exact "rotation
 * must never change the right answer" invariant the mission brief requires.
 * Each ray's drawn-toward distance is independently randomized on purpose:
 * the renderer ignores it (fixed ray length), and several tests assert nothing
 * downstream of it ever depends on this distance.
 */
export function buildVertexScene(
  random: () => number,
  vertexLabel: string,
  rayDegreesRelative: readonly number[],
  armLabels: readonly string[],
  options: { center?: Point; baseRotationDeg?: number; mirror?: boolean } = {},
): VertexScene {
  if (rayDegreesRelative.length !== armLabels.length) {
    throw new Error('buildVertexScene: rayDegreesRelative and armLabels must have the same length');
  }
  const center = options.center ?? STAGE_CENTER;
  const baseRotation = options.baseRotationDeg ?? 0;
  const mirrorFactor = options.mirror ? -1 : 1;
  const rays: RaySpec[] = rayDegreesRelative.map((deg, index) => {
    const appliedDeg = normalizeDegrees(mirrorFactor * deg + baseRotation);
    const drawnTowardDistance = 70 + randomInt(random, 0, 60);
    return {
      id: `ray-${index}`,
      label: armLabels[index],
      through: pointFromAngle(center, appliedDeg, drawnTowardDistance),
    };
  });
  return { vertex: { id: 'vertex', label: vertexLabel, point: center }, rays };
}

/** Picks `count` relative ray degrees (0..180, sorted) spaced apart enough that no two rays visually overlap. */
export function pickSpreadDegrees(random: () => number, count: number, minGapDeg = 18, maxTotalSpanDeg = 150): number[] {
  const values: number[] = [0];
  let cursor = 0;
  for (let i = 1; i < count; i += 1) {
    const remainingSlots = count - i;
    const maxCursor = maxTotalSpanDeg - minGapDeg * remainingSlots;
    const gap = minGapDeg + randomInt(random, 0, Math.max(0, Math.floor((maxCursor - cursor) / remainingSlots)));
    cursor += gap;
    values.push(cursor);
  }
  return values;
}
