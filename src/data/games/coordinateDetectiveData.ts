import type { DetectiveChallenge, MistakeCategory } from '../../types/coordinateDetective';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNonZero(min: number, max: number): number {
  let value = 0;
  while (value === 0) value = randomInt(min, max);
  return value;
}

const ALL_CATEGORIES: MistakeCategory[] = ['swappedXY', 'xSignError', 'ySignError', 'axisConfusion', 'zeroConfusion'];

function withDistractors(correct: MistakeCategory): MistakeCategory[] {
  const others = ALL_CATEGORIES.filter((c) => c !== correct);
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 2);
  const options = [correct, ...shuffled];
  return options.sort(() => Math.random() - 0.5);
}

function makeSwapped(id: string): DetectiveChallenge {
  const x = randomNonZero(-5, 5);
  let y = randomNonZero(-5, 5);
  while (Math.abs(x) === Math.abs(y)) y = randomNonZero(-5, 5);
  return { id, target: { x, y }, wrongAnswer: { x: y, y: x }, category: 'swappedXY', options: withDistractors('swappedXY') };
}

function makeXSign(id: string): DetectiveChallenge {
  const x = randomNonZero(-5, 5);
  const y = randomInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
  return { id, target: { x, y }, wrongAnswer: { x: -x, y }, category: 'xSignError', options: withDistractors('xSignError') };
}

function makeYSign(id: string): DetectiveChallenge {
  const y = randomNonZero(-5, 5);
  const x = randomInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
  return { id, target: { x, y }, wrongAnswer: { x, y: -y }, category: 'ySignError', options: withDistractors('ySignError') };
}

function makeAxisConfusion(id: string): DetectiveChallenge {
  const onXAxis = Math.random() < 0.5;
  const magnitude = randomNonZero(-5, 5);
  const target = onXAxis ? { x: magnitude, y: 0 } : { x: 0, y: magnitude };
  const nudge = randomInt(1, 2) * (Math.random() < 0.5 ? 1 : -1);
  const wrongAnswer = onXAxis ? { x: magnitude, y: nudge } : { x: nudge, y: magnitude };
  return { id, target, wrongAnswer, category: 'axisConfusion', options: withDistractors('axisConfusion') };
}

function makeZeroConfusion(id: string): DetectiveChallenge {
  const wrongAnswer = { x: randomInt(1, 2) * (Math.random() < 0.5 ? 1 : -1), y: randomInt(1, 2) * (Math.random() < 0.5 ? 1 : -1) };
  return { id, target: { x: 0, y: 0 }, wrongAnswer, category: 'zeroConfusion', options: withDistractors('zeroConfusion') };
}

const GENERATORS: ((id: string) => DetectiveChallenge)[] = [
  makeSwapped,
  makeXSign,
  makeYSign,
  makeAxisConfusion,
  makeZeroConfusion,
  makeSwapped,
];

export function buildCoordinateDetectiveChallenges(): DetectiveChallenge[] {
  return GENERATORS.map((generator, i) => generator(`detective-${i}`));
}

export const COORDINATE_DETECTIVE_TOTAL = GENERATORS.length;
