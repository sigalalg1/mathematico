import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type { Geo4DifficultyId, Geo4PointsChallenge, Geo4PointsKind } from '../../types/geometryGrade4';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { sideMidpoint } from '../../geometry/polygonScene';
import { buildDifficultyPolygon, buildOpenChain, canonicalizeSet, STAGE_CENTER } from './grade4GeoShared';

/**
 * Group 1 — points, segments & polygons (מכירים את שפת הגיאומטריה, chapter
 * "נקודות, קטעים ומצולעים" per the mission brief's own curriculum text; see
 * the final report for the no-source-PDF note). Seven interaction kinds so
 * the group never settles into one flashcard-style pattern: tap a specific
 * vertex (optionally among on-side decoy points, directly testing the
 * "vertex vs. a point on a side" misconception), tap any side, select every
 * vertex/side, judge whether one shown shape is a polygon (closed vs. open,
 * straight vs. curved), count sides, and pick the one real polygon out of a
 * small gallery.
 */
export const GEO4_POINTS_RULES_VERSION = 1;

const SIDE_COUNT_RANGE: Record<Geo4DifficultyId, [number, number]> = {
  basic: [3, 4],
  intermediate: [4, 6],
  advanced: [5, 8],
};

const KIND_POOL: Record<Geo4DifficultyId, Geo4PointsKind[]> = {
  basic: ['tapVertex', 'tapSide', 'isPolygon', 'countSides'],
  intermediate: ['tapVertex', 'selectAllVertices', 'selectAllSides', 'isPolygon', 'galleryPick', 'countSides'],
  advanced: ['selectAllSides', 'galleryPick', 'isPolygon', 'countSides', 'tapVertex', 'selectAllVertices'],
};

function randomSideCount(random: () => number, difficulty: Geo4DifficultyId): number {
  const [min, max] = SIDE_COUNT_RANGE[difficulty];
  return randomInt(random, min, max);
}

function makeTapVertexChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  const useDecoy = difficulty !== 'basic';
  const decoySideIndex = useDecoy ? randomInt(random, 0, scene.vertices.length - 1) : undefined;
  return {
    id: `geo4-points-tapvertex-${difficulty}-${index}`,
    kind: 'tapVertex',
    difficulty,
    scene,
    decoySideIndex,
    promptKey: useDecoy ? 'grade4Geometry.points.prompt.tapVertexNotDecoy' : 'grade4Geometry.points.prompt.tapVertex',
    answer: 'vertex',
    options: useDecoy ? ['vertex', 'decoy'] : ['vertex'],
    feedbackKey: useDecoy ? 'grade4Geometry.points.feedback.tapVertexNotDecoy' : 'grade4Geometry.points.feedback.tapVertex',
  };
}

function makeTapSideChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  return {
    id: `geo4-points-tapside-${difficulty}-${index}`,
    kind: 'tapSide',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.points.prompt.tapSide',
    answer: 'side',
    options: ['side'],
    feedbackKey: 'grade4Geometry.points.feedback.tapSide',
  };
}

function makeSelectAllVerticesChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  const answer = canonicalizeSet(scene.vertices.map((v) => v.id));
  return {
    id: `geo4-points-selectvertices-${difficulty}-${index}`,
    kind: 'selectAllVertices',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.points.prompt.selectAllVertices',
    answer,
    options: [answer],
    feedbackKey: 'grade4Geometry.points.feedback.selectAllVertices',
  };
}

function makeSelectAllSidesChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const scene = buildDifficultyPolygon(random, randomSideCount(random, difficulty), difficulty);
  const answer = canonicalizeSet(scene.vertices.map((_, i) => `s${i}`));
  return {
    id: `geo4-points-selectsides-${difficulty}-${index}`,
    kind: 'selectAllSides',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.points.prompt.selectAllSides',
    answer,
    options: [answer],
    feedbackKey: 'grade4Geometry.points.feedback.selectAllSides',
  };
}

type ShapeVariant = 'polygon' | 'open' | 'curved';

function buildVariantScene(random: () => number, difficulty: Geo4DifficultyId, variant: ShapeVariant, options: { center?: { x: number; y: number }; radius?: number } = {}) {
  const sides = randomSideCount(random, difficulty);
  if (variant === 'open') return buildOpenChain(random, sides, difficulty, options);
  const scene = buildDifficultyPolygon(random, sides, difficulty, options);
  if (variant === 'curved') return { ...scene, curved: true };
  return scene;
}

function makeIsPolygonChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const variants: ShapeVariant[] = difficulty === 'basic' ? ['polygon', 'open'] : ['polygon', 'open', 'curved'];
  const variant = pickRandom(random, variants);
  const scene = buildVariantScene(random, difficulty, variant);
  const answer = variant === 'polygon' ? 'yes' : 'no';
  return {
    id: `geo4-points-ispolygon-${difficulty}-${index}`,
    kind: 'isPolygon',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.points.prompt.isPolygon',
    answer,
    options: ['yes', 'no'],
    feedbackKey: `grade4Geometry.points.feedback.isPolygon.${variant}`,
  };
}

function makeCountSidesChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const sides = randomSideCount(random, difficulty);
  const scene = buildDifficultyPolygon(random, sides, difficulty);
  const distractors = shuffle(
    [sides - 1, sides + 1, sides + 2].filter((n) => n >= 3 && n !== sides),
    random,
  ).slice(0, 2);
  const options = shuffle([String(sides), ...distractors.map(String)], random);
  return {
    id: `geo4-points-countsides-${difficulty}-${index}`,
    kind: 'countSides',
    difficulty,
    scene,
    promptKey: 'grade4Geometry.points.prompt.countSides',
    answer: String(sides),
    options,
    feedbackKey: 'grade4Geometry.points.feedback.countSides',
  };
}

function makeGalleryPickChallenge(difficulty: Geo4DifficultyId, index: number, random: () => number): Geo4PointsChallenge {
  const positions = [
    { x: 90, y: 100 },
    { x: 230, y: 100 },
    { x: 90, y: 230 },
    { x: 230, y: 230 },
  ];
  const variantPool: ShapeVariant[] = difficulty === 'basic' ? ['polygon', 'open', 'open'] : ['polygon', 'open', 'curved', 'open'];
  const count = difficulty === 'basic' ? 3 : 4;
  const correctSlot = randomInt(random, 0, count - 1);
  const gallery = Array.from({ length: count }, (_, i) => {
    const variant: ShapeVariant = i === correctSlot ? 'polygon' : pickRandom(random, variantPool.filter((v) => v !== 'polygon'));
    const scene = buildVariantScene(random, difficulty, variant, { center: positions[i], radius: 55 });
    return { id: `g${i}`, scene };
  });
  return {
    id: `geo4-points-gallery-${difficulty}-${index}`,
    kind: 'galleryPick',
    difficulty,
    gallery,
    promptKey: 'grade4Geometry.points.prompt.galleryPick',
    answer: `g${correctSlot}`,
    options: gallery.map((g) => g.id),
    feedbackKey: 'grade4Geometry.points.feedback.galleryPick',
  };
}

function makeChallenge(difficulty: Geo4DifficultyId, kind: Geo4PointsKind, index: number, random: () => number): Geo4PointsChallenge {
  switch (kind) {
    case 'tapVertex':
      return makeTapVertexChallenge(difficulty, index, random);
    case 'tapSide':
      return makeTapSideChallenge(difficulty, index, random);
    case 'selectAllVertices':
      return makeSelectAllVerticesChallenge(difficulty, index, random);
    case 'selectAllSides':
      return makeSelectAllSidesChallenge(difficulty, index, random);
    case 'isPolygon':
      return makeIsPolygonChallenge(difficulty, index, random);
    case 'countSides':
      return makeCountSidesChallenge(difficulty, index, random);
    case 'galleryPick':
      return makeGalleryPickChallenge(difficulty, index, random);
    default:
      throw new Error(`grade4GeoPointsData: unhandled kind "${kind satisfies never}"`);
  }
}

/** Programmatic soundness check, exercised across many seeds by the test suite — never trusted by eye alone. */
export function assertGeo4PointsChallengeIsSound(challenge: Geo4PointsChallenge): void {
  if (challenge.options.filter((o) => o === challenge.answer).length !== 1) {
    throw new Error(`geo4-points "${challenge.kind}": question must encode exactly one correct answer`);
  }
  if (challenge.kind === 'selectAllVertices' && challenge.scene) {
    if (challenge.answer !== canonicalizeSet(challenge.scene.vertices.map((v) => v.id))) {
      throw new Error('selectAllVertices answer must be the full canonical vertex-id set');
    }
  }
  if (challenge.kind === 'selectAllSides' && challenge.scene) {
    if (challenge.answer !== canonicalizeSet(challenge.scene.vertices.map((_, i) => `s${i}`))) {
      throw new Error('selectAllSides answer must be the full canonical side-id set');
    }
  }
  if (challenge.kind === 'galleryPick' && challenge.gallery) {
    const correct = challenge.gallery.find((g) => g.id === challenge.answer);
    if (!correct || !correct.scene.closed || correct.scene.curved) {
      throw new Error('galleryPick answer must resolve to the one genuine (closed, straight-sided) polygon in the gallery');
    }
    const others = challenge.gallery.filter((g) => g.id !== challenge.answer);
    if (others.some((g) => g.scene.closed && !g.scene.curved)) {
      throw new Error('galleryPick must have exactly one genuine polygon among its options');
    }
  }
  if (challenge.kind === 'countSides' && challenge.scene) {
    const expected = challenge.scene.vertices.length;
    if (challenge.answer !== String(expected)) throw new Error('countSides answer must equal the scene\'s actual vertex/side count');
  }
}

export interface Geo4PointsTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildGeo4PointsQuestions({ difficultyId, count, seed }: Geo4PointsTrainingInput): TrainingQuestion<Geo4PointsChallenge>[] {
  const difficulty: Geo4DifficultyId = difficultyId === 'intermediate' || difficultyId === 'advanced' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KIND_POOL[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertGeo4PointsChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.promptKey,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const GEO4_POINTS_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 8, 12],
  defaultQuestionCount: 8,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'grade4Geometry.points.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'grade4Geometry.points.difficulty.intermediate' },
    { id: 'advanced', labelKey: 'training.difficulty.hard', descriptionKey: 'grade4Geometry.points.difficulty.advanced' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: GEO4_POINTS_RULES_VERSION,
};

export const geo4PointsActivity: TrainingActivityDefinition<Geo4PointsChallenge> = {
  id: 'geo4Points',
  i18nPrefix: 'grade4Geometry.points',
  capabilities: GEO4_POINTS_CAPABILITIES,
  generateQuestions: buildGeo4PointsQuestions,
};

// Re-exported for the page component, which needs the same midpoint math to
// place its decoy "point on a side" handle exactly where the renderer draws it.
export { sideMidpoint, STAGE_CENTER };
