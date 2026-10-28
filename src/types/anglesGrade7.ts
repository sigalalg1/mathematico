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

export type AngleNotationKind = 'selectName' | 'selectInvalid' | 'triangleInterior' | 'selectAllNames';

/**
 * One candidate three-letter (or vertex-only) name offered by a
 * `selectAllNames` question — `valid` is the ground truth the generator
 * computed via `isValidAngleName`/`canUseVertexOnlyName`, never derived from
 * the option's position or id.
 */
export interface AngleNotationNameOption {
  id: string;
  name: string;
  valid: boolean;
}

export interface AngleNotationChallenge {
  id: string;
  kind: AngleNotationKind;
  difficulty: AnglesDifficultyId;
  /** Present for 'selectName' / 'selectInvalid' / 'selectAllNames'. */
  scene?: VertexScene;
  highlightedRef?: AngleRef;
  /** Present for 'triangleInterior' — enrichment beyond the textbook excerpt, see i18n copy. */
  triangle?: LabeledTriangle;
  highlightedVertexIndex?: 0 | 1 | 2;
  usesGreekLetter?: boolean;
  /**
   * Present only for 'selectAllNames' — the textbook's own "pick every
   * correct name" format. The number of `valid` options deliberately varies
   * per question (2, or 3 when a vertex-only name is also unambiguous) —
   * that variation is the whole pedagogical point, see the generator.
   */
  nameOptions?: AngleNotationNameOption[];
  promptKey: string;
  promptValues?: Record<string, string>;
  /**
   * For every other kind, one of `options`. For 'selectAllNames' this is
   * instead the canonical sorted/joined `nameOptions` ids that are correct
   * (e.g. "correct-0,correct-1") — the single combined answer the page
   * submits once the student has toggled their full selection.
   */
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

// --- 6. Measure-the-angle digital protractor (the exam's third skill: measuring — own build, see report) --------

export interface AngleMeasureChallenge {
  id: string;
  kind: 'measure';
  difficulty: AnglesDifficultyId;
  vertex: { x: number; y: number };
  /** The one fixed reference ray the protractor's own baseline auto-aligns to. */
  fixedThrough: { x: number; y: number };
  /** The ray whose measure (from `fixedThrough`) the student reads off the protractor. */
  measuredThrough: { x: number; y: number };
  targetDegrees: number;
  toleranceDeg: number;
  answer: string;
  options: string[];
  promptKey: string;
  feedbackKey: string;
}
