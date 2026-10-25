import type { Point } from '../types/geometry';

export type { Point };

/**
 * Four-way angle classification used by the Grade 7 Angles unit (chapter 20:
 * זווית חדה / ישרה / קהה / שטוחה). The existing Grade 3 `AngleType` in
 * `types/geometry.ts` only has three members (acute/right/obtuse) and is left
 * untouched — this is a separate, additive type for the richer Grade 7 model.
 */
export type AngleType7 = 'acute' | 'right' | 'obtuse' | 'straight';

/** A point with a stable id and a capital-letter label, as chapter 21 requires every point to have. */
export interface LabeledPoint {
  id: string;
  /** Capital-letter label shown next to the point (e.g. "A"). */
  label: string;
  point: Point;
}

/**
 * One ray in a "fan" of rays sharing a vertex. Only the *direction* toward
 * `through` matters mathematically — the renderer always draws every ray at
 * the same fixed on-screen length (see `components/geometry`), because
 * chapter 22 explicitly tests the misconception that a longer-drawn ray means
 * a bigger angle. Ray length must never leak angle size.
 */
export interface RaySpec {
  id: string;
  label: string;
  through: Point;
}

/**
 * The core reusable primitive behind chapters 20–21: one vertex with two or
 * more rays fanning out from it. A single `VertexScene` can host many
 * distinct named angles (one per pair of rays), which is exactly the
 * "∠BAD vs ∠BAC vs ∠CAD" worked example from chapter 21.
 */
export interface VertexScene {
  vertex: LabeledPoint;
  rays: RaySpec[];
}

/** One angle picked out from a `VertexScene`: the pair of rays that bound it. */
export interface AngleRef {
  vertexId: string;
  rayAId: string;
  rayBId: string;
}

/** A fully-resolved angle: geometry already computed from a `VertexScene` + `AngleRef`. */
export interface ResolvedAngle {
  vertex: LabeledPoint;
  rayA: RaySpec;
  rayB: RaySpec;
  /** The angle's true measure in degrees, in [0, 180]. */
  degrees: number;
  type: AngleType7;
}

/** A plain triangle with labeled vertices, for the light Skill-E enrichment (naming an interior angle). */
export interface LabeledTriangle {
  vertices: [LabeledPoint, LabeledPoint, LabeledPoint];
}

/** A point positioned on an integer coordinate grid, for the chapter-21 coordinate bridging exercise. */
export interface GridLabeledPoint extends LabeledPoint {
  x: number;
  y: number;
}
