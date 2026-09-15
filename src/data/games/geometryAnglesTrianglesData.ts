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
const ANGLES: Record<AngleType, readonly number[]> = {
  acute: [24, 37, 52, 68, 81, 89],
  right: [90],
  obtuse: [91, 105, 123, 142, 166],
};

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

function angleCandidates(random: () => number, target: AngleType, many = false) {
  const types: AngleType[] = many ? [target, target, 'acute', 'right', 'obtuse'] : ['acute', 'right', 'obtuse'];
  return shuffle(types.map((type, index) => ({
    id: `angle-${index}-${type}`,
    angle: randomAngle(random, type),
    rotation: randomInt(random, 0, 359),
    answer: type,
  })), random);
}

function triangleCandidates(random: () => number, dimension: 'sides' | 'angles', target: string) {
  const entries = shuffle([...VALID_DUAL_CLASSIFICATIONS], random);
  const correct = entries.find((entry) => entry.classification[dimension] === target)!;
  const wrong = entries.filter((entry) => entry.classification[dimension] !== target).slice(0, 2);
  return shuffle([correct, ...wrong].map((entry, index) => ({
    id: `triangle-${index}-${entry.key}`,
    points: rotateTriangle(entry.points, randomInt(random, 0, 359)),
    rotation: 0,
    answer: entry.classification[dimension],
  })), random);
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
  if (interaction === 'hunt-angle' || interaction === 'find-corners') {
    return { ...base, targetAngle, candidates: angleCandidates(random, targetAngle, true), correctAnswer: targetAngle };
  }
  if (interaction === 'build-angle') {
    return { ...base, targetAngle, angle: 45, correctAnswer: targetAngle };
  }
  if (interaction === 'explore-triangle') {
    const entry = pickRandom(random, VALID_DUAL_CLASSIFICATIONS);
    return { ...base, points: rotateTriangle(entry.points, rotation), correctAnswer: 'done' };
  }
  const entry = pickRandom(random, VALID_DUAL_CLASSIFICATIONS);
  if (interaction === 'select-sides') {
    return { ...base, targetAngle, points: rotateTriangle(entry.points, rotation), candidates: triangleCandidates(random, 'sides', entry.classification.sides), correctAnswer: entry.classification.sides };
  }
  if (interaction === 'select-triangle-angle') {
    return { ...base, points: rotateTriangle(entry.points, rotation), candidates: triangleCandidates(random, 'angles', entry.classification.angles), correctAnswer: entry.classification.angles };
  }
  if (interaction === 'triangle-lab') {
    return { ...base, points: rotateTriangle(entry.points, rotation), correctAnswer: `${entry.classification.sides}-${entry.classification.angles}` };
  }
  if (interaction === 'riddle') {
    const classification = entry.classification;
    return {
      ...base,
      points: rotateTriangle(entry.points, rotation),
      candidates: dualCandidates(random, entry.key),
      correctAnswer: classification.sides,
      riddleKeys: [`geometry.riddles.sides.${classification.sides}`, `geometry.riddles.angles.${classification.angles}`],
    };
  }
  return {
    ...base,
    points: rotateTriangle(entry.points, rotation),
    candidates: triangleCandidates(random, index % 2 ? 'angles' : 'sides', index % 2 ? entry.classification.angles : entry.classification.sides),
    correctAnswer: index % 2 ? entry.classification.angles : entry.classification.sides,
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
  return triangles.every((points) => isValidTriangle(points)) && (!challenge.candidates || challenge.candidates.some((candidate) => candidate.answer === challenge.correctAnswer));
}
