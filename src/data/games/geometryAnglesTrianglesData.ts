import type { AngleType, GeometryActivityId, GeometryChallenge, GeometryInteraction, Point, TriangleAngleType, TriangleSideType } from '../../types/geometry';
import { classifyTriangle, isValidTriangle, rotateTriangle } from '../../utils/geometry';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';

export const GEOMETRY_ACTIVITY_IDS: GeometryActivityId[] = [
  'meet-the-angle',
  'angle-types',
  'angle-hunter',
  'build-an-angle',
  'find-the-angles',
  'meet-the-triangle',
  'triangles-by-sides',
  'triangles-by-angles',
  'triangle-lab',
  'who-am-i',
  'rotation',
  'geometry-challenge',
];

export const GEOMETRY_SESSION_SIZE = 6;
export const GEOMETRY_CHALLENGE_SESSION_SIZE = 12;
/**
 * Angles offered for "what type of angle is this?".
 *
 * Every acute value stays at most `90 - NON_RIGHT_ANGLE_MARGIN` and every
 * obtuse value at least `90 + NON_RIGHT_ANGLE_MARGIN`, so no drawn angle can be
 * mistaken for a right angle by eye. Only the right-angle bucket uses 90°.
 */
const ANGLES: Record<AngleType, readonly number[]> = {
  acute: [22, 31, 40, 48, 57, 66, 75],
  right: [90],
  obtuse: [105, 116, 127, 138, 149, 160, 168],
};

const SIDE_TYPES: readonly TriangleSideType[] = ['equilateral', 'isosceles', 'scalene'];
const TRIANGLE_ANGLE_TYPES: readonly TriangleAngleType[] = ['acute', 'right', 'obtuse'];

const TRIANGLES: Record<string, [Point, Point, Point]> = {
  'equilateral-acute': [{ x: 50, y: 15 }, { x: 12, y: 81 }, { x: 88, y: 81 }],
  'isosceles-acute': [{ x: 50, y: 8 }, { x: 18, y: 84 }, { x: 82, y: 84 }],
  'isosceles-right': [{ x: 18, y: 18 }, { x: 18, y: 82 }, { x: 82, y: 18 }],
  'isosceles-obtuse': [{ x: 50, y: 42 }, { x: 8, y: 76 }, { x: 92, y: 76 }],
  'scalene-acute': [{ x: 40, y: 8 }, { x: 8, y: 84 }, { x: 93, y: 68 }],
  'scalene-right': [{ x: 13, y: 17 }, { x: 13, y: 84 }, { x: 88, y: 84 }],
  'scalene-obtuse': [{ x: 16, y: 22 }, { x: 31, y: 76 }, { x: 91, y: 76 }],
};

export function triangleTemplate(side: TriangleSideType, angle: TriangleAngleType): [Point, Point, Point] | undefined {
  const points = TRIANGLES[`${side}-${angle}`];
  return points ? points.map((point) => ({ ...point })) as [Point, Point, Point] : undefined;
}

export const VALID_DUAL_CLASSIFICATIONS = Object.entries(TRIANGLES).map(([key, points]) => ({
  key,
  points,
  classification: classifyTriangle(points),
}));

function randomAngle(random: () => number, type: AngleType): number {
  return pickRandom(random, ANGLES[type]);
}

function angleCandidates(random: () => number, target: AngleType) {
  const types: AngleType[] = [target, target, 'acute', 'right', 'obtuse'];
  return shuffle(types.map((type, index) => ({
    id: `angle-${index}-${type}`,
    angle: randomAngle(random, type),
    rotation: randomInt(random, 0, 359),
    answer: type,
  })), random);
}

/**
 * Which classifications the three offered triangles carry.
 *
 * "Choose the isosceles triangle" never offers an equilateral distractor: this
 * curriculum treats the three side classes as exclusive, but an equilateral
 * triangle does have two equal sides, so a child picking it would be
 * mathematically right and still be marked wrong. Two different scalene
 * triangles take its place instead.
 */
function candidateTypes(dimension: 'sides' | 'angles', target: string): string[] {
  if (dimension === 'angles') return ['acute', 'right', 'obtuse'];
  if (target === 'isosceles') return ['isosceles', 'scalene', 'scalene'];
  return ['equilateral', 'isosceles', 'scalene'];
}

function triangleCandidates(random: () => number, dimension: 'sides' | 'angles', target: string) {
  const used = new Set<string>();
  const entries = candidateTypes(dimension, target).map((type) => {
    const pool = VALID_DUAL_CLASSIFICATIONS.filter((entry) => entry.classification[dimension] === type);
    const fresh = pool.filter((entry) => !used.has(entry.key));
    const entry = pickRandom(random, fresh.length > 0 ? fresh : pool);
    used.add(entry.key);
    return entry;
  });
  return shuffle(entries.map((entry, index) => {
    const points = rotateTriangle(entry.points, randomInt(random, 0, 359));
    return {
      id: `triangle-${index}-${entry.key}`,
      points,
      rotation: 0,
      // Read back off the very points that get drawn, never asserted separately.
      answer: classifyTriangle(points)[dimension],
    };
  }), random);
}

function dualCandidates(random: () => number, targetKey: string) {
  const correct = VALID_DUAL_CLASSIFICATIONS.find((entry) => entry.key === targetKey)!;
  const wrong = shuffle(VALID_DUAL_CLASSIFICATIONS.filter((entry) => entry.key !== targetKey), random).slice(0, 2);
  return shuffle([correct, ...wrong].map((entry, index) => ({
    id: `triangle-${index}-${entry.key}`,
    points: rotateTriangle(entry.points, randomInt(random, 0, 359)),
    rotation: 0,
    answer: entry.key === targetKey ? correct.classification.sides : entry.key,
  })), random);
}

function interactionFor(activityId: GeometryActivityId, index: number): GeometryInteraction {
  if (activityId !== 'geometry-challenge') {
    return {
      'meet-the-angle': 'explore-angle',
      'angle-types': 'select-angle',
      'angle-hunter': 'hunt-angle',
      'build-an-angle': 'build-angle',
      'find-the-angles': 'find-corners',
      'meet-the-triangle': 'explore-triangle',
      'triangles-by-sides': 'select-sides',
      'triangles-by-angles': 'select-triangle-angle',
      'triangle-lab': 'triangle-lab',
      'who-am-i': 'riddle',
      rotation: 'rotation',
      'geometry-challenge': 'select-angle',
    }[activityId] as GeometryInteraction;
  }
  return (['select-angle', 'hunt-angle', 'build-angle', 'find-corners', 'select-sides', 'select-triangle-angle', 'triangle-lab', 'riddle', 'rotation'] as const)[index % 9];
}

function makeChallenge(activityId: GeometryActivityId, index: number, random: () => number): GeometryChallenge {
  const interaction = interactionFor(activityId, index);
  const targetAngle = pickRandom(random, ['acute', 'right', 'obtuse'] as const);
  const rotation = randomInt(random, 0, 359);
  const base = { id: `${activityId}-${index}-${interaction}`, activityId, interaction, rotation, promptKey: `geometry.prompts.${interaction}` };

  if (interaction === 'explore-angle') {
    return { ...base, angle: randomAngle(random, targetAngle), targetAngle, correctAnswer: 'done' };
  }
  if (interaction === 'select-angle') {
    return { ...base, angle: randomAngle(random, targetAngle), targetAngle, correctAnswer: targetAngle };
  }
  if (interaction === 'hunt-angle') {
    return { ...base, targetAngle, candidates: angleCandidates(random, targetAngle), correctAnswer: targetAngle };
  }
  if (interaction === 'find-corners') {
    // Answered by clicking a real corner of the illustrated scene, so the
    // challenge only needs the requested type; the scene owns the geometry.
    return { ...base, targetAngle, correctAnswer: targetAngle };
  }
  if (interaction === 'build-angle') {
    return { ...base, targetAngle, angle: 45, correctAnswer: targetAngle };
  }
  if (interaction === 'explore-triangle') {
    const entry = pickRandom(random, VALID_DUAL_CLASSIFICATIONS);
    return { ...base, points: rotateTriangle(entry.points, rotation), correctAnswer: 'done' };
  }
  const entry = pickRandom(random, VALID_DUAL_CLASSIFICATIONS);
  if (interaction === 'select-sides' || interaction === 'select-triangle-angle') {
    const dimension = interaction === 'select-sides' ? 'sides' : 'angles';
    const target = pickRandom(random, dimension === 'sides' ? SIDE_TYPES : TRIANGLE_ANGLE_TYPES);
    const candidates = triangleCandidates(random, dimension, target);
    // The prompt is taken from a candidate that really carries that shape, so
    // the asked-for class always exists among the drawn options.
    const correct = candidates.find((candidate) => candidate.answer === target)!;
    return { ...base, candidates, correctAnswer: correct.answer };
  }
  if (interaction === 'triangle-lab') {
    return { ...base, points: rotateTriangle(entry.points, rotation), correctAnswer: `${entry.classification.sides}-${entry.classification.angles}` };
  }
  if (interaction === 'riddle') {
    const riddlePoints = rotateTriangle(entry.points, rotation);
    const classification = classifyTriangle(riddlePoints);
    return {
      ...base,
      points: riddlePoints,
      candidates: dualCandidates(random, entry.key),
      correctAnswer: classification.sides,
      riddleKeys: [`geometry.riddles.sides.${classification.sides}`, `geometry.riddles.angles.${classification.angles}`],
    };
  }
  // 'rotation': one drawn triangle plus three type buttons. The answer is read
  // back off the rotated points that are actually shown.
  const points = rotateTriangle(entry.points, rotation);
  const classification = classifyTriangle(points);
  return {
    ...base,
    points,
    correctAnswer: index % 2 ? classification.angles : classification.sides,
  };
}

export function generateGeometryActivity(
  activityId: GeometryActivityId,
  seed: number,
  count = activityId === 'geometry-challenge' ? GEOMETRY_CHALLENGE_SESSION_SIZE : GEOMETRY_SESSION_SIZE,
): GeometryChallenge[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, (_, index) => makeChallenge(activityId, index, random));
}

export function isGeometryChallengeCorrect(challenge: GeometryChallenge, answer: string): boolean {
  return answer === challenge.correctAnswer;
}

export function validateGeneratedChallenge(challenge: GeometryChallenge): boolean {
  const triangles = [challenge.points, ...(challenge.candidates ?? []).map((candidate) => candidate.points)].filter(Boolean) as [Point, Point, Point][];
  if (!triangles.every((points) => isValidTriangle(points))) return false;
  if (!challenge.candidates) return true;
  // Every triangle option must be labelled with the class its own drawn points
  // really have, and exactly one option may answer the prompt.
  const dimension = challenge.interaction === 'select-sides' ? 'sides' : challenge.interaction === 'select-triangle-angle' ? 'angles' : null;
  if (dimension) {
    const labelled = challenge.candidates.every((candidate) => candidate.points && classifyTriangle(candidate.points)[dimension] === candidate.answer);
    const matching = challenge.candidates.filter((candidate) => candidate.answer === challenge.correctAnswer);
    return labelled && matching.length === 1;
  }
  return challenge.candidates.some((candidate) => candidate.answer === challenge.correctAnswer);
}
