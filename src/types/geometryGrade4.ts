import type { PolygonScene, VertexScene } from '../geometry/types';

/**
 * Grade 4 "Learning the Language of Geometry" unit — shared types for all
 * five training activities (one per learning group in the mission brief).
 * Every payload carries the exact `PolygonScene`/`VertexScene` the diagram is
 * rendered from, same discipline the Grade 7 Angles unit's types established:
 * the rendered diagram and the graded answer can never disagree because both
 * come from the same geometry object.
 */
export type Geo4DifficultyId = 'basic' | 'intermediate' | 'advanced';

// --- Group 1: points, segments & polygons -----------------------------

export type Geo4PointsKind = 'tapVertex' | 'tapSide' | 'selectAllVertices' | 'selectAllSides' | 'isPolygon' | 'countSides' | 'galleryPick';

export interface Geo4PointsChallenge {
  id: string;
  kind: Geo4PointsKind;
  difficulty: Geo4DifficultyId;
  scene?: PolygonScene;
  /** 'galleryPick' only: several small scenes, one of which is the target. */
  gallery?: { id: string; scene: PolygonScene }[];
  /** 'tapVertex' only, intermediate+: a decoy point placed on a side's midpoint (not a vertex), testing the vertex-vs-point-on-a-side misconception directly. */
  decoySideIndex?: number;
  promptKey: string;
  promptValues?: Record<string, string>;
  /** Canonical answer the session compares against (a single id, or a sorted-joined multi-select set). */
  answer: string;
  options: string[];
  feedbackKey: string;
}

// --- Group 2: angles (reuses the Grade 7 vertex-scene angle engine) ---

export type Geo4AngleKind = 'tapVertexOrArm' | 'classifyType' | 'selectAllRight' | 'compareRayLength';

export interface Geo4AngleChallenge {
  id: string;
  kind: Geo4AngleKind;
  difficulty: Geo4DifficultyId;
  scene?: VertexScene;
  /** 'selectAllRight' only: several small vertex scenes, some of which show a right angle. */
  gallery?: { id: string; scene: VertexScene; isRight: boolean }[];
  promptKey: string;
  promptValues?: Record<string, string>;
  answer: string;
  options: string[];
  feedbackKey: string;
}

// --- Group 3: relationships inside polygons ----------------------------

export type Geo4RelationsKind =
  | 'tapAdjacentSide'
  | 'constructDiagonal'
  | 'selectAllDiagonalsFromVertex'
  | 'compareSideVsDiagonal'
  | 'parallelOrPerpendicular'
  | 'misconceptionDiagonal';

export interface Geo4RelationsChallenge {
  id: string;
  kind: Geo4RelationsKind;
  difficulty: Geo4DifficultyId;
  scene: PolygonScene;
  /** The vertex or side index the prompt refers to, when relevant. */
  focusVertexIndex?: number;
  focusSideIndex?: number;
  /** 'constructDiagonal'/'selectAllDiagonalsFromVertex': every segment the child may tap, each as [fromVertexIndex, toVertexIndex]. */
  candidateSegments?: [number, number][];
  /** 'compareSideVsDiagonal'/'misconceptionDiagonal': the two (or one) highlighted segments as vertex-index pairs. */
  highlightedSegments?: [number, number][];
  promptKey: string;
  promptValues?: Record<string, string>;
  answer: string;
  options: string[];
  feedbackKey: string;
}

// --- Group 4: naming and recognizing polygons --------------------------

export type Geo4FamilyKind = 'nameByCount' | 'countThenName' | 'tapInGallery' | 'selectAllOfFamily' | 'orientationMisconception' | 'quadrilateralVocab';

export interface Geo4FamilyChallenge {
  id: string;
  kind: Geo4FamilyKind;
  difficulty: Geo4DifficultyId;
  scene?: PolygonScene;
  gallery?: { id: string; scene: PolygonScene; sideCount: number; familyKey: string }[];
  promptKey: string;
  promptValues?: Record<string, string>;
  answer: string;
  options: string[];
  feedbackKey: string;
}

// --- Group 5: perimeter, area & measurement vocabulary ------------------

export type Geo4MeasurementKind = 'whichIsPerimeter' | 'whichIsArea' | 'unitMatch' | 'conceptTrueFalse' | 'sideLengthVocab';

export interface Geo4MeasurementChallenge {
  id: string;
  kind: Geo4MeasurementKind;
  difficulty: Geo4DifficultyId;
  scene?: PolygonScene;
  /** 'whichIsPerimeter'/'whichIsArea'/'sideLengthVocab': two or more labeled panels of the same shape, each showing a different concept. */
  gallery?: { id: string; scene: PolygonScene; mode: 'perimeter' | 'area' | 'sideLength' | 'plain'; highlightSideIndex?: number }[];
  promptKey: string;
  promptValues?: Record<string, string>;
  answer: string;
  options: string[];
  feedbackKey: string;
}
