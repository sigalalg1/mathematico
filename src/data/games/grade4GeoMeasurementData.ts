import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { Geo4DifficultyId, Geo4MeasurementChallenge, Geo4MeasurementKind } from '../../types/geometryGrade4';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { buildDifficultyPolygon } from './grade4GeoShared';

/**
 * Group 5 — perimeter, area & measurement vocabulary (היקף, שטח ומדידה).
 * Strictly vocabulary/conceptual, per the mission brief's explicit scope
 * limit: every question asks the child to recognize *which representation*
 * (a traced boundary vs. a filled region vs. one highlighted side) matches a
 * term, or which unit kind (length vs. square) matches a quantity — never to
 * compute a perimeter or area value for a specific shape. `conceptTrueFalse`
 * draws from a small fixed pool of always-true/always-false definitional
 * claims (these are facts about what the words mean, not about any one
 * generated shape, so they are not geometry-derived like the other groups'
 * checks).
 */
export const GEO4_MEASUREMENT_RULES_VERSION = 1;

type PanelMode = 'perimeter' | 'area' | 'sideLength' | 'plain';

const GALLERY_POSITIONS = [
  { x: 90, y: 110 },
  { x: 230, y: 110 },
  { x: 160, y: 250 },
];

const KIND_POOL: Record<Geo4DifficultyId, Geo4MeasurementKind[]> = {
  basic: ['whichIsPerimeter', 'whichIsArea', 'unitMatch'],
  intermediate: ['whichIsPerimeter', 'whichIsArea', 'sideLengthVocab', 'unitMatch', 'conceptTrueFalse'],
  advanced: ['sideLengthVocab', 'unitMatch', 'conceptTrueFalse', 'whichIsPerimeter', 'whichIsArea'],
};

function buildConceptGallery(
  random: () => number,
  difficulty: Geo4DifficultyId,
  targetMode: PanelMode,
): { id: string; scene: ReturnType<typeof buildDifficultyPolygon>; mode: PanelMode; highlightSideIndex?: number }[] {
  const otherModes: PanelMode[] = (['perimeter', 'area', 'sideLength'] as PanelMode[]).filter((m) => m !== targetMode);
  const count = difficulty === 'basic' ? 2 : 3;
  const modes = shuffle([targetMode, ...otherModes.slice(0, count - 1)], random);
  return modes.map((mode, i) => {
    const sides = randomInt(random, 4, 6);
    const scene = buildDifficultyPolygon(random, sides, difficulty, { center: GALLERY_POSITIONS[i], radius: 55 });
    const highlightSideIndex = mode === 'sideLength' ? randomInt(random, 0, scene.vertices.length - 1) : undefined;
    return { id: `g${i}`, scene, mode, highlightSideIndex };
  });
}

function makeGalleryChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number, targetMode: 'perimeter' | 'area' | 'sideLength', kind: Geo4MeasurementKind, promptKey: string, feedbackKey: string): Geo4MeasurementChallenge {
  const gallery = buildConceptGallery(random, difficulty, targetMode);
  const target = gallery.find((g) => g.mode === targetMode)!;
  return {
    id: `geo4-measurement-${kind}-${difficulty}-${index}`,
    kind,
    difficulty,
    gallery,
    promptKey,
    answer: target.id,
    options: gallery.map((g) => g.id),
    feedbackKey,
  };
}

function makeUnitMatchChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4MeasurementChallenge {
  const target = pickRandom(random, ['perimeter', 'area'] as const);
  const sides = randomInt(random, 4, 6);
  const scene = buildDifficultyPolygon(random, sides, difficulty);
  const gallery = [{ id: 'g0', scene, mode: target as PanelMode }];
  const answer = target === 'perimeter' ? 'cm' : 'cm2';
  return {
    id: `geo4-measurement-unit-${difficulty}-${index}`,
    kind: 'unitMatch',
    difficulty,
    gallery,
    promptKey: target === 'perimeter' ? 'grade4Geometry.measurement.prompt.unitMatchPerimeter' : 'grade4Geometry.measurement.prompt.unitMatchArea',
    answer,
    options: ['cm', 'cm2'],
    feedbackKey: target === 'perimeter' ? 'grade4Geometry.measurement.feedback.unitMatchPerimeter' : 'grade4Geometry.measurement.feedback.unitMatchArea',
  };
}

const TRUE_FALSE_CLAIMS: { key: string; answer: 'true' | 'false' }[] = [
  { key: 'sameThing', answer: 'false' },
  { key: 'unitsDiffer', answer: 'true' },
  { key: 'areaNeedsSquareUnit', answer: 'true' },
  { key: 'perimeterIsRegion', answer: 'false' },
];

function makeConceptTrueFalseChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4MeasurementChallenge {
  const claim = pickRandom(random, TRUE_FALSE_CLAIMS);
  const sides = randomInt(random, 4, 6);
  const scene = buildDifficultyPolygon(random, sides, difficulty);
  return {
    id: `geo4-measurement-truefalse-${difficulty}-${index}`,
    kind: 'conceptTrueFalse',
    difficulty,
    scene,
    promptKey: `grade4Geometry.measurement.prompt.claim.${claim.key}`,
    answer: claim.answer,
    options: ['true', 'false'],
    feedbackKey: `grade4Geometry.measurement.feedback.claim.${claim.key}`,
  };
}

function makeChallenge(difficulty: Geo4DifficultyId, kind: Geo4MeasurementKind, index: number, random: () => number): Geo4MeasurementChallenge {
  switch (kind) {
    case 'whichIsPerimeter':
      return makeGalleryChallenge(difficulty, index, random, 'perimeter', kind, 'grade4Geometry.measurement.prompt.whichIsPerimeter', 'grade4Geometry.measurement.feedback.whichIsPerimeter');
    case 'whichIsArea':
      return makeGalleryChallenge(difficulty, index, random, 'area', kind, 'grade4Geometry.measurement.prompt.whichIsArea', 'grade4Geometry.measurement.feedback.whichIsArea');
    case 'sideLengthVocab':
      return makeGalleryChallenge(difficulty, index, random, 'sideLength', kind, 'grade4Geometry.measurement.prompt.sideLengthVocab', 'grade4Geometry.measurement.feedback.sideLengthVocab');
    case 'unitMatch':
      return makeUnitMatchChallenge(difficulty, index, random);
    case 'conceptTrueFalse':
      return makeConceptTrueFalseChallenge(difficulty, index, random);
    default:
      throw new Error(`grade4GeoMeasurementData: unhandled kind "${kind satisfies never}"`);
  }
}

export function assertGeo4MeasurementChallengeIsSound(challenge: Geo4MeasurementChallenge): void {
  if (challenge.options.filter((o) => o === challenge.answer).length !== 1) {
    throw new Error(`geo4-measurement "${challenge.kind}": question must encode exactly one correct answer`);
  }
  if ((challenge.kind === 'whichIsPerimeter' || challenge.kind === 'whichIsArea' || challenge.kind === 'sideLengthVocab') && challenge.gallery) {
    const targetMode = challenge.kind === 'whichIsPerimeter' ? 'perimeter' : challenge.kind === 'whichIsArea' ? 'area' : 'sideLength';
    const correct = challenge.gallery.find((g) => g.id === challenge.answer);
    if (!correct || correct.mode !== targetMode) throw new Error(`${challenge.kind}: answer must resolve to the gallery panel in "${targetMode}" mode`);
    const matchingCount = challenge.gallery.filter((g) => g.mode === targetMode).length;
    if (matchingCount !== 1) throw new Error(`${challenge.kind}: exactly one gallery panel must be in "${targetMode}" mode`);
  }
}

export interface Geo4MeasurementTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildGeo4MeasurementQuestions({ difficultyId, count, seed }: Geo4MeasurementTrainingInput): TrainingQuestion<Geo4MeasurementChallenge>[] {
  const difficulty: Geo4DifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertGeo4MeasurementChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const GEO4_MEASUREMENT_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 8, 12],
  defaultQuestionCount: 8,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'grade4Geometry.measurement.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'grade4Geometry.measurement.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'grade4Geometry.measurement.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: GEO4_MEASUREMENT_RULES_VERSION,
};

export const geo4MeasurementActivity: TrainingActivityDefinition<Geo4MeasurementChallenge> = {
  id: 'geo4Measurement',
  i18nPrefix: 'grade4Geometry.measurement',
  capabilities: GEO4_MEASUREMENT_CAPABILITIES,
  generateQuestions: buildGeo4MeasurementQuestions,
};
