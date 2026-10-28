import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { Geo4DifficultyId, Geo4FamilyChallenge, Geo4FamilyKind } from '../../types/geometryGrade4';
import {
  buildParallelogramVertices,
  buildPolygonScene,
  buildRectangleVertices,
  buildRhombusVertices,
  buildSquareVertices,
  buildTrapezoidVertices,
  polygonFamilyKey,
} from '../../geometry/polygonScene';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { buildDifficultyPolygon, pickLabels, randomRotation, STAGE_CENTER } from './grade4GeoShared';

/**
 * Group 4 — naming and recognizing polygons (משפחת המצולעים). A polygon's
 * family name depends purely on its side count (3..8 → triangle..octagon);
 * every generator here varies orientation and regularity freely (including
 * genuinely rotated and "point down" examples) so a child never silently
 * learns "a triangle points up" or "a square sits level." The five named
 * quadrilaterals (square/rectangle/rhombus/parallelogram/trapezoid) are
 * recognition vocabulary only, per the mission brief — never asked to
 * classify a shape as "a rectangle that is also a parallelogram," just to
 * name the one best-fitting family for an unambiguously-built example (see
 * `geometry/polygonScene`'s `isXShape` classifiers).
 */
export const GEO4_FAMILY_RULES_VERSION = 1;

const FAMILY_NAMES = ['triangle', 'quadrilateral', 'pentagon', 'hexagon', 'heptagon', 'octagon'];
const QUAD_VOCAB_NAMES = ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezoid'] as const;

const SIDE_COUNT_RANGE: Record<Geo4DifficultyId, [number, number]> = {
  basic: [3, 5],
  intermediate: [3, 6],
  advanced: [3, 8],
};

const KIND_POOL: Record<Geo4DifficultyId, Geo4FamilyKind[]> = {
  basic: ['nameByCount', 'countThenName', 'tapInGallery'],
  intermediate: ['nameByCount', 'tapInGallery', 'selectAllOfFamily', 'orientationMisconception', 'quadrilateralVocab'],
  advanced: ['selectAllOfFamily', 'quadrilateralVocab', 'orientationMisconception', 'nameByCount', 'tapInGallery'],
};

const GALLERY_POSITIONS = [
  { x: 90, y: 100 },
  { x: 230, y: 100 },
  { x: 90, y: 230 },
  { x: 230, y: 230 },
];

function randomSideCount(random: () => number, difficulty: Geo4DifficultyId): number {
  const [min, max] = SIDE_COUNT_RANGE[difficulty];
  return randomInt(random, min, max);
}

function makeNameByCountChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4FamilyChallenge {
  const sides = randomSideCount(random, difficulty);
  const scene = buildDifficultyPolygon(random, sides, difficulty);
  const correctName = polygonFamilyKey(sides);
  const distractors = shuffle(FAMILY_NAMES.filter((n) => n !== correctName), random).slice(0, 3);
  const options = shuffle([correctName, ...distractors], random);
  return {
    id: `geo4-family-name-${difficulty}-${index}`,
    kind: 'nameByCount',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.family.prompt.nameByCount',
    answer: correctName,
    options,
    feedbackKey: 'grade4Geometry.family.feedback.nameByCount',
  };
}

function makeCountThenNameChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4FamilyChallenge {
  const sides = randomSideCount(random, difficulty);
  const scene = buildDifficultyPolygon(random, sides, difficulty);
  const distractors = shuffle([sides - 1, sides + 1, sides + 2].filter((n) => n >= 3 && n !== sides), random).slice(0, 2);
  const options = shuffle([String(sides), ...distractors.map(String)], random);
  return {
    id: `geo4-family-count-${difficulty}-${index}`,
    kind: 'countThenName',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.family.prompt.countThenName',
    answer: String(sides),
    options,
    feedbackKey: 'grade4Geometry.family.feedback.countThenName',
  };
}

function makeTapInGalleryChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4FamilyChallenge {
  const count = difficulty === 'basic' ? 3 : 4;
  const sideCounts = shuffle(
    Array.from({ length: 6 }, (_, i) => i + 3).filter((n) => n <= (SIDE_COUNT_RANGE[difficulty][1])),
    random,
  ).slice(0, count);
  while (sideCounts.length < count) sideCounts.push(3 + ((sideCounts.length * 2) % 6));
  const targetSlot = randomInt(random, 0, count - 1);
  const gallery = sideCounts.map((sides, i) => {
    const scene = buildDifficultyPolygon(random, sides, difficulty, { center: GALLERY_POSITIONS[i], radius: 55 });
    return { id: `g${i}`, scene, sideCount: sides, familyKey: polygonFamilyKey(sides) };
  });
  const target = gallery[targetSlot];
  return {
    id: `geo4-family-gallery-${difficulty}-${index}`,
    kind: 'tapInGallery',
    difficulty,
    gallery,
    promptKey: 'grade4Geometry.family.prompt.tapInGallery',
    promptValues: { name: target.familyKey },
    answer: target.id,
    options: gallery.map((g) => g.id),
    feedbackKey: 'grade4Geometry.family.feedback.tapInGallery',
  };
}

function makeSelectAllOfFamilyChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4FamilyChallenge {
  const [, max] = SIDE_COUNT_RANGE[difficulty];
  const targetSides = randomInt(random, 3, Math.min(6, max));
  const count = 4;
  const targetCount = randomInt(random, 1, 2);
  const slots = shuffle(Array.from({ length: count }, (_, i) => i), random);
  const targetSlots = new Set(slots.slice(0, targetCount));
  const gallery = Array.from({ length: count }, (_, i) => {
    const isTarget = targetSlots.has(i);
    const sides = isTarget ? targetSides : pickRandom(random, Array.from({ length: max - 2 }, (_, k) => k + 3).filter((n) => n !== targetSides));
    const scene = buildDifficultyPolygon(random, sides, difficulty, { center: GALLERY_POSITIONS[i], radius: 55 });
    return { id: `g${i}`, scene, sideCount: sides, familyKey: polygonFamilyKey(sides) };
  });
  const answer = gallery
    .filter((g) => g.sideCount === targetSides)
    .map((g) => g.id)
    .sort()
    .join(',');
  return {
    id: `geo4-family-selectall-${difficulty}-${index}`,
    kind: 'selectAllOfFamily',
    difficulty,
    gallery,
    promptKey: 'grade4Geometry.family.prompt.selectAllOfFamily',
    promptValues: { name: polygonFamilyKey(targetSides) },
    answer,
    options: [answer],
    feedbackKey: 'grade4Geometry.family.feedback.selectAllOfFamily',
  };
}

function makeOrientationMisconceptionChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4FamilyChallenge {
  const sides = pickRandom(random, [3, 4, 5] as const);
  // Deliberately rotated — often "upside down" relative to its usual textbook pose.
  const rotation = pickRandom(random, [150, 160, 170, 180, 190, 200, 210] as const) + randomRotation(random, difficulty);
  const scene = buildDifficultyPolygon(random, sides, difficulty, { rotationDeg: rotation });
  const claimIsTrueVersion = random() < 0.5;
  return {
    id: `geo4-family-orientation-${difficulty}-${index}`,
    kind: 'orientationMisconception',
    difficulty,
    scene,
    promptKey: claimIsTrueVersion
      ? 'grade4Geometry.family.prompt.orientationTrue'
      : 'grade4Geometry.family.prompt.orientationFalse',
    promptValues: { name: polygonFamilyKey(sides) },
    answer: claimIsTrueVersion ? 'true' : 'false',
    options: ['true', 'false'],
    feedbackKey: 'grade4Geometry.family.feedback.orientation',
  };
}

function makeQuadrilateralVocabChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4FamilyChallenge {
  const name = pickRandom(random, QUAD_VOCAB_NAMES);
  const rotation = randomRotation(random, difficulty);
  let points;
  if (name === 'square') points = buildSquareVertices(STAGE_CENTER, 90, rotation);
  else if (name === 'rectangle') points = buildRectangleVertices(STAGE_CENTER, 100, 55, rotation);
  else if (name === 'rhombus') points = buildRhombusVertices(STAGE_CENTER, 110, 55, rotation);
  else if (name === 'parallelogram') points = buildParallelogramVertices(STAGE_CENTER, 55, 32, 30, rotation);
  else points = buildTrapezoidVertices(STAGE_CENTER, 45, 95, 65, rotation);
  const scene = buildPolygonScene(`quad-${name}-${index}`, points, pickLabels(random, 4));
  const distractors = shuffle(QUAD_VOCAB_NAMES.filter((n) => n !== name), random).slice(0, 3);
  const options = shuffle([name, ...distractors], random);
  return {
    id: `geo4-family-quadvocab-${difficulty}-${index}`,
    kind: 'quadrilateralVocab',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.family.prompt.quadrilateralVocab',
    answer: name,
    options,
    feedbackKey: 'grade4Geometry.family.feedback.quadrilateralVocab',
  };
}

function makeChallenge(difficulty: Geo4DifficultyId, kind: Geo4FamilyKind, index: number, random: () => number): Geo4FamilyChallenge {
  switch (kind) {
    case 'nameByCount':
      return makeNameByCountChallenge(difficulty, index, random);
    case 'countThenName':
      return makeCountThenNameChallenge(difficulty, index, random);
    case 'tapInGallery':
      return makeTapInGalleryChallenge(difficulty, index, random);
    case 'selectAllOfFamily':
      return makeSelectAllOfFamilyChallenge(difficulty, index, random);
    case 'orientationMisconception':
      return makeOrientationMisconceptionChallenge(difficulty, index, random);
    case 'quadrilateralVocab':
      return makeQuadrilateralVocabChallenge(difficulty, index, random);
    default:
      throw new Error(`grade4GeoFamilyData: unhandled kind "${kind satisfies never}"`);
  }
}

export function assertGeo4FamilyChallengeIsSound(challenge: Geo4FamilyChallenge): void {
  if (challenge.options.filter((o) => o === challenge.answer).length !== 1) {
    throw new Error(`geo4-family "${challenge.kind}": question must encode exactly one correct answer`);
  }
  if (challenge.kind === 'nameByCount' && challenge.scene) {
    if (challenge.answer !== polygonFamilyKey(challenge.scene.vertices.length)) throw new Error('nameByCount answer must match the scene\'s real side count');
  }
  if (challenge.kind === 'countThenName' && challenge.scene) {
    if (challenge.answer !== String(challenge.scene.vertices.length)) throw new Error('countThenName answer must match the scene\'s real side count');
  }
  if (challenge.kind === 'tapInGallery' && challenge.gallery) {
    const correct = challenge.gallery.find((g) => g.id === challenge.answer);
    if (!correct) throw new Error('tapInGallery answer must resolve to a gallery item');
  }
  if (challenge.kind === 'selectAllOfFamily' && challenge.gallery) {
    const targetName = challenge.promptValues?.name;
    const expected = challenge.gallery
      .filter((g) => g.familyKey === targetName)
      .map((g) => g.id)
      .sort()
      .join(',');
    if (challenge.answer !== expected) throw new Error('selectAllOfFamily answer must be exactly the gallery items matching the target family');
  }
}

export interface Geo4FamilyTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildGeo4FamilyQuestions({ difficultyId, count, seed }: Geo4FamilyTrainingInput): TrainingQuestion<Geo4FamilyChallenge>[] {
  const difficulty: Geo4DifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertGeo4FamilyChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const GEO4_FAMILY_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 8, 12],
  defaultQuestionCount: 8,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'grade4Geometry.family.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'grade4Geometry.family.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'grade4Geometry.family.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: GEO4_FAMILY_RULES_VERSION,
};

export const geo4FamilyActivity: TrainingActivityDefinition<Geo4FamilyChallenge> = {
  id: 'geo4Family',
  i18nPrefix: 'grade4Geometry.family',
  capabilities: GEO4_FAMILY_CAPABILITIES,
  generateQuestions: buildGeo4FamilyQuestions,
};
