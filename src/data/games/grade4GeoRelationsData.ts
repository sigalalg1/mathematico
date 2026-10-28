import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { Geo4DifficultyId, Geo4RelationsChallenge, Geo4RelationsKind } from '../../types/geometryGrade4';
import {
  buildPolygonScene,
  buildRectangleVertices,
  isAdjacentVertexPair,
  isDiagonalPair,
  segmentsAreParallel,
  segmentsArePerpendicular,
  sideEndpoints,
  sideVertexIndices,
} from '../../geometry/polygonScene';
import { createSeededRandom, randomInt } from '../../utils/seededRandom';
import { buildDifficultyPolygon, pickLabels, randomRotation, STAGE_CENTER } from './grade4GeoShared';

/**
 * Group 3 — relationships inside polygons (צלעות, קודקודים ואלכסונים). The
 * single most important invariant this generator must enforce (mission
 * brief's own explicit requirement): a diagonal connects two *non-adjacent*
 * vertices — never "any segment drawn inside the shape." Every kind here
 * that touches diagonals calls `isDiagonalPair` as its single source of
 * truth, the same function the unit tests exercise directly across many
 * seeds, rather than letting a UI shortcut quietly redefine the term.
 */
export const GEO4_RELATIONS_RULES_VERSION = 1;

const SIDE_COUNT_RANGE: Record<Geo4DifficultyId, [number, number]> = {
  basic: [4, 5],
  intermediate: [4, 6],
  advanced: [5, 8],
};

const KIND_POOL: Record<Geo4DifficultyId, Geo4RelationsKind[]> = {
  basic: ['tapAdjacentSide', 'compareSideVsDiagonal', 'misconceptionDiagonal'],
  intermediate: ['tapAdjacentSide', 'constructDiagonal', 'compareSideVsDiagonal', 'parallelOrPerpendicular', 'misconceptionDiagonal'],
  advanced: ['constructDiagonal', 'selectAllDiagonalsFromVertex', 'parallelOrPerpendicular', 'misconceptionDiagonal', 'compareSideVsDiagonal'],
};

function randomSideCount(random: () => number, difficulty: Geo4DifficultyId): number {
  const [min, max] = SIDE_COUNT_RANGE[difficulty];
  return randomInt(random, min, max);
}

function makeTapAdjacentSideChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4RelationsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  const n = scene.vertices.length;
  const focusSideIndex = randomInt(random, 0, n - 1);
  return {
    id: `geo4-relations-adjside-${difficulty}-${index}`,
    kind: 'tapAdjacentSide',
    difficulty,
    scene,
    focusSideIndex,
    promptKey: 'grade4Geometry.relations.prompt.tapAdjacentSide',
    answer: 'adjacent',
    options: ['adjacent', 'not-adjacent'],
    feedbackKey: 'grade4Geometry.relations.feedback.tapAdjacentSide',
  };
}

function makeConstructDiagonalChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4RelationsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  const n = scene.vertices.length;
  const focusVertexIndex = randomInt(random, 0, n - 1);
  const candidateSegments: [number, number][] = Array.from({ length: n }, (_, j) => j).filter((j) => j !== focusVertexIndex).map((j) => [focusVertexIndex, j] as [number, number]);
  return {
    id: `geo4-relations-construct-${difficulty}-${index}`,
    kind: 'constructDiagonal',
    difficulty,
    scene,
    focusVertexIndex,
    candidateSegments,
    promptKey: 'grade4Geometry.relations.prompt.constructDiagonal',
    answer: 'diagonal',
    options: ['diagonal', 'not-diagonal'],
    feedbackKey: 'grade4Geometry.relations.feedback.constructDiagonal',
  };
}

function makeSelectAllDiagonalsChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4RelationsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  const n = scene.vertices.length;
  const focusVertexIndex = randomInt(random, 0, n - 1);
  const candidateSegments: [number, number][] = Array.from({ length: n }, (_, j) => j).filter((j) => j !== focusVertexIndex).map((j) => [focusVertexIndex, j] as [number, number]);
  const diagonalTargets = candidateSegments.filter(([a, b]) => isDiagonalPair(scene, a, b));
  const answer = diagonalTargets
    .map(([, b]) => String(b))
    .sort((a, b) => Number(a) - Number(b))
    .join(',');
  return {
    id: `geo4-relations-selectdiag-${difficulty}-${index}`,
    kind: 'selectAllDiagonalsFromVertex',
    difficulty,
    scene,
    focusVertexIndex,
    candidateSegments,
    promptKey: 'grade4Geometry.relations.prompt.selectAllDiagonals',
    answer,
    options: [answer],
    feedbackKey: 'grade4Geometry.relations.feedback.selectAllDiagonals',
  };
}

function makeCompareSideVsDiagonalChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4RelationsChallenge {
  const sides = Math.max(5, randomSideCount(random, difficulty)); // needs at least one real diagonal
  const scene = buildDifficultyPolygon(random, sides, difficulty);
  const n = scene.vertices.length;
  const sideIndex = randomInt(random, 0, n - 1);
  const [sa, sb] = sideVertexIndices(scene, sideIndex);
  let da = 0;
  let db = 0;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    da = randomInt(random, 0, n - 1);
    db = randomInt(random, 0, n - 1);
    if (isDiagonalPair(scene, da, db)) break;
  }
  const highlightedSegments: [number, number][] = [[sa, sb], [da, db]];
  return {
    id: `geo4-relations-compare-${difficulty}-${index}`,
    kind: 'compareSideVsDiagonal',
    difficulty,
    scene,
    highlightedSegments,
    promptKey: 'grade4Geometry.relations.prompt.compareSideVsDiagonal',
    answer: 'segment-1',
    options: ['segment-0', 'segment-1'],
    feedbackKey: 'grade4Geometry.relations.feedback.compareSideVsDiagonal',
  };
}

const PARALLEL_SAFETY_MARGIN_DEG = 10;

function classifyRelation(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): 'parallel' | 'perpendicular' | 'neither' {
  if (segmentsAreParallel(a, b, c, d, PARALLEL_SAFETY_MARGIN_DEG)) return 'parallel';
  if (segmentsArePerpendicular(a, b, c, d, PARALLEL_SAFETY_MARGIN_DEG)) return 'perpendicular';
  return 'neither';
}

function makeParallelOrPerpendicularChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4RelationsChallenge {
  const useRectangle = random() < 0.4;
  if (useRectangle) {
    const width = 80 + randomInt(random, 0, 40);
    const height = width * 0.55;
    const rotation = randomRotation(random, difficulty);
    const points = buildRectangleVertices(STAGE_CENTER, width, height, rotation);
    const labels = pickLabels(random, 4);
    const scene = buildPolygonScene(`rect-${index}`, points, labels);
    const useOpposite = random() < 0.5;
    const highlightedSegments: [number, number][] = useOpposite ? [[0, 1], [2, 3]] : [[0, 1], [1, 2]];
    const [seg0, seg1] = highlightedSegments;
    const relation = classifyRelation(scene.vertices[seg0[0]].point, scene.vertices[seg0[1]].point, scene.vertices[seg1[0]].point, scene.vertices[seg1[1]].point);
    return {
      id: `geo4-relations-parallel-${difficulty}-${index}`,
      kind: 'parallelOrPerpendicular',
      difficulty,
      scene,
      highlightedSegments,
      promptKey: 'grade4Geometry.relations.prompt.parallelOrPerpendicular',
      answer: relation,
      options: ['parallel', 'perpendicular', 'neither'],
      feedbackKey: `grade4Geometry.relations.feedback.parallelOrPerpendicular.${relation}`,
    };
  }

  // General (likely irregular) polygon: pick two sides, derive the ground
  // truth from the real drawn coordinates, resampling if the relation is too
  // close to a classification boundary to be a fair call by eye.
  const scene = buildDifficultyPolygon(random, Math.max(5, randomSideCount(random, difficulty)), difficulty);
  const n = scene.vertices.length;
  let sideA = 0;
  let sideB = 0;
  let relation: 'parallel' | 'perpendicular' | 'neither' = 'neither';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    sideA = randomInt(random, 0, n - 1);
    sideB = randomInt(random, 0, n - 1);
    if (sideA === sideB) continue;
    const [a, b] = sideEndpoints(scene, sideA);
    const [c, d] = sideEndpoints(scene, sideB);
    relation = classifyRelation(a, b, c, d);
    break;
  }
  const [va, vb] = sideVertexIndices(scene, sideA);
  const [vc, vd] = sideVertexIndices(scene, sideB);
  return {
    id: `geo4-relations-parallel-${difficulty}-${index}`,
    kind: 'parallelOrPerpendicular',
    difficulty,
    scene,
    highlightedSegments: [[va, vb], [vc, vd]],
    promptKey: 'grade4Geometry.relations.prompt.parallelOrPerpendicular',
    answer: relation,
    options: ['parallel', 'perpendicular', 'neither'],
    feedbackKey: `grade4Geometry.relations.feedback.parallelOrPerpendicular.${relation}`,
  };
}

function makeMisconceptionDiagonalChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4RelationsChallenge {
  const scene = buildDifficultyPolygon(random, Math.max(4, randomSideCount(random, difficulty)), difficulty);
  const n = scene.vertices.length;
  const showRealDiagonal = random() < 0.5;
  let a = 0;
  let b = 0;
  if (showRealDiagonal) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      a = randomInt(random, 0, n - 1);
      b = randomInt(random, 0, n - 1);
      if (isDiagonalPair(scene, a, b)) break;
    }
  } else {
    a = randomInt(random, 0, n - 1);
    const [, adjacent] = sideVertexIndices(scene, a);
    b = adjacent;
  }
  return {
    id: `geo4-relations-misconception-${difficulty}-${index}`,
    kind: 'misconceptionDiagonal',
    difficulty,
    scene,
    highlightedSegments: [[a, b]],
    promptKey: 'grade4Geometry.relations.prompt.misconceptionDiagonal',
    answer: showRealDiagonal ? 'true' : 'false',
    options: ['true', 'false'],
    feedbackKey: showRealDiagonal ? 'grade4Geometry.relations.feedback.misconceptionDiagonal.true' : 'grade4Geometry.relations.feedback.misconceptionDiagonal.false',
  };
}

function makeChallenge(difficulty: Geo4DifficultyId, kind: Geo4RelationsKind, index: number, random: () => number): Geo4RelationsChallenge {
  switch (kind) {
    case 'tapAdjacentSide':
      return makeTapAdjacentSideChallenge(difficulty, index, random);
    case 'constructDiagonal':
      return makeConstructDiagonalChallenge(difficulty, index, random);
    case 'selectAllDiagonalsFromVertex':
      return makeSelectAllDiagonalsChallenge(difficulty, index, random);
    case 'compareSideVsDiagonal':
      return makeCompareSideVsDiagonalChallenge(difficulty, index, random);
    case 'parallelOrPerpendicular':
      return makeParallelOrPerpendicularChallenge(difficulty, index, random);
    case 'misconceptionDiagonal':
      return makeMisconceptionDiagonalChallenge(difficulty, index, random);
    default:
      throw new Error(`grade4GeoRelationsData: unhandled kind "${kind satisfies never}"`);
  }
}

export function assertGeo4RelationsChallengeIsSound(challenge: Geo4RelationsChallenge): void {
  if (challenge.options.filter((o) => o === challenge.answer).length !== 1) {
    throw new Error(`geo4-relations "${challenge.kind}": question must encode exactly one correct answer`);
  }
  if (challenge.kind === 'constructDiagonal' && challenge.candidateSegments) {
    const hasAtLeastOneDiagonal = challenge.candidateSegments.some(([a, b]) => isDiagonalPair(challenge.scene, a, b));
    if (!hasAtLeastOneDiagonal) throw new Error('constructDiagonal scene must offer at least one real diagonal from the focus vertex');
  }
  if (challenge.kind === 'selectAllDiagonalsFromVertex' && challenge.candidateSegments) {
    const expected = challenge.candidateSegments
      .filter(([a, b]) => isDiagonalPair(challenge.scene, a, b))
      .map(([, b]) => String(b))
      .sort((a, b) => Number(a) - Number(b))
      .join(',');
    if (challenge.answer !== expected) throw new Error('selectAllDiagonalsFromVertex answer must be exactly the diagonal set computed by isDiagonalPair');
  }
  if (challenge.kind === 'compareSideVsDiagonal' && challenge.highlightedSegments) {
    const [[sa, sb], [da, db]] = challenge.highlightedSegments;
    if (!isAdjacentVertexPair(challenge.scene, sa, sb)) throw new Error('compareSideVsDiagonal segment-0 must be a genuine side');
    if (!isDiagonalPair(challenge.scene, da, db)) throw new Error('compareSideVsDiagonal segment-1 must be a genuine diagonal');
  }
  if (challenge.kind === 'misconceptionDiagonal' && challenge.highlightedSegments) {
    const [[a, b]] = challenge.highlightedSegments;
    const reallyDiagonal = isDiagonalPair(challenge.scene, a, b);
    if ((challenge.answer === 'true') !== reallyDiagonal) throw new Error('misconceptionDiagonal answer disagrees with isDiagonalPair on the highlighted segment');
  }
}

export interface Geo4RelationsTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildGeo4RelationsQuestions({ difficultyId, count, seed }: Geo4RelationsTrainingInput): TrainingQuestion<Geo4RelationsChallenge>[] {
  const difficulty: Geo4DifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertGeo4RelationsChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const GEO4_RELATIONS_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 8, 12],
  defaultQuestionCount: 8,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'grade4Geometry.relations.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'grade4Geometry.relations.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'grade4Geometry.relations.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: GEO4_RELATIONS_RULES_VERSION,
};

export const geo4RelationsActivity: TrainingActivityDefinition<Geo4RelationsChallenge> = {
  id: 'geo4Relations',
  i18nPrefix: 'grade4Geometry.relations',
  capabilities: GEO4_RELATIONS_CAPABILITIES,
  generateQuestions: buildGeo4RelationsQuestions,
};
