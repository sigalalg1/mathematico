import type { AngleRef, AngleType7, LabeledTriangle, VertexScene } from '../geometry/types';

/**
 * Grade 7 Angles unit — shared types for all five training activities. Every
 * payload carries a `VertexScene` (or `LabeledTriangle`) built by
 * `src/geometry`, so the rendered diagram and the graded answer can never
 * disagree: both come from the exact same geometry.
 */
export type AnglesDifficultyId = 'basic' | 'intermediate' | 'advanced';

// --- 1. Rays, vertex & angle identification (Skill A — chapter 20) --------

export type AngleIdentifyKind = 'vertex' | 'rays' | 'angle';

export interface AngleIdentifyChallenge {
  id: string;
  kind: AngleIdentifyKind;
  difficulty: AnglesDifficultyId;
  scene: VertexScene;
  promptKey: string;
  promptValues?: Record<string, string>;
  /** 'angle' kind: every candidate angle drawn at once, each independently tappable. */
  angleOptions?: { id: string; ref: AngleRef }[];
  /** 'vertex' kind: every point id (vertex + ray endpoints) that is independently tappable. */
  pointOptionIds?: string[];
  /** 'rays' kind: candidate ray-id pairs, rendered as text MCQ options ("B and C"). */
  rayPairOptions?: { id: string; rayIds: [string, string]; labels: [string, string] }[];
  answer: string;
  options: string[];
  feedbackKey: string;
}

// --- 2. Angle types: classify + compare-by-size ordering (Skill B — chapter 20) --------

export interface AngleClassifyChallenge {
  id: string;
  kind: 'classify';
  difficulty: AnglesDifficultyId;
  scene: VertexScene;
  ref: AngleRef;
  degrees: number;
  answer: AngleType7;
  options: AngleType7[];
  feedbackKey: string;
}

export interface AngleOrderOption {
  id: string;
  scene: VertexScene;
  ref: AngleRef;
  degrees: number;
}

export interface AngleOrderChallenge {
  id: string;
  kind: 'order';
  difficulty: AnglesDifficultyId;
  options: AngleOrderOption[];
  mode: 'smallest' | 'largest';
  answer: string;
  feedbackKey: string;
}

export type AngleTypeChallenge = AngleClassifyChallenge | AngleOrderChallenge;

// --- 3. Angle notation (Skill D — chapter 21; `triangleInterior` is light Skill-E enrichment) --------

export type AngleNotationKind = 'selectName' | 'selectInvalid' | 'triangleInterior';

export interface AngleNotationChallenge {
  id: string;
  kind: AngleNotationKind;
  difficulty: AnglesDifficultyId;
  /** Present for 'selectName' / 'selectInvalid'. */
  scene?: VertexScene;
  highlightedRef?: AngleRef;
  /** Present for 'triangleInterior' — enrichment beyond the textbook excerpt, see i18n copy. */
  triangle?: LabeledTriangle;
  highlightedVertexIndex?: 0 | 1 | 2;
  usesGreekLetter?: boolean;
  promptKey: string;
  promptValues?: Record<string, string>;
  answer: string;
  options: string[];
  feedbackKey: string;
}

// --- 4. Comparing angle sizes (chapter 22) --------

export interface AngleCompareSide {
  scene: VertexScene;
  ref: AngleRef;
  degrees: number;
}

export interface AngleCompareChallenge {
  id: string;
  kind: 'compare';
  difficulty: AnglesDifficultyId;
  left: AngleCompareSide;
  right: AngleCompareSide;
  answer: '<' | '=' | '>';
  options: ['<', '=', '>'];
  feedbackKey: string;
}

// --- 5. Construct-an-angle drag lab (Skill C — own build, see report) --------

export interface AngleConstructChallenge {
  id: string;
  kind: 'construct';
  difficulty: AnglesDifficultyId;
  vertex: { x: number; y: number };
  fixedThrough: { x: number; y: number };
  startDraggableThrough: { x: number; y: number };
  targetType: AngleType7;
  /** Only set for the advanced tier, which targets a specific measure rather than just a type. */
  targetDegrees?: number;
  toleranceDeg: number;
  answer: string;
  options: string[];
  promptKey: string;
  promptValues?: Record<string, string>;
  feedbackKey: string;
}
