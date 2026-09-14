import type { FindPointChallenge, FindPointOption, FindPointStageDef, Point } from '../../types/findThePoint';

export const FIND_THE_POINT_MIN = -5;
export const FIND_THE_POINT_MAX = 5;

const LABELS = ['A', 'B', 'C', 'D'] as const;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNonZeroInt(min: number, max: number): number {
  let value = 0;
  while (value === 0) value = randomInt(min, max);
  return value;
}

function key(p: Point): string {
  return `${p.x},${p.y}`;
}

function inRange(p: Point): boolean {
  return p.x >= FIND_THE_POINT_MIN && p.x <= FIND_THE_POINT_MAX && p.y >= FIND_THE_POINT_MIN && p.y <= FIND_THE_POINT_MAX;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Point generators per stage category ---

function pointInQuadrant1(): Point {
  return { x: randomInt(1, FIND_THE_POINT_MAX), y: randomInt(1, FIND_THE_POINT_MAX) };
}

function pointInQuadrant(quadrant: 1 | 2 | 3 | 4): Point {
  const magX = randomInt(1, FIND_THE_POINT_MAX);
  const magY = randomInt(1, FIND_THE_POINT_MAX);
  switch (quadrant) {
    case 1:
      return { x: magX, y: magY };
    case 2:
      return { x: -magX, y: magY };
    case 3:
      return { x: -magX, y: -magY };
    case 4:
      return { x: magX, y: -magY };
  }
}

function pointOnAxis(onX: boolean): Point {
  const value = randomNonZeroInt(FIND_THE_POINT_MIN, FIND_THE_POINT_MAX);
  return onX ? { x: value, y: 0 } : { x: 0, y: value };
}

function pointAnywhere(): Point {
  return { x: randomInt(FIND_THE_POINT_MIN, FIND_THE_POINT_MAX), y: randomInt(FIND_THE_POINT_MIN, FIND_THE_POINT_MAX) };
}

// --- Pedagogically meaningful distractor candidates ---

type DistractorFn = (p: Point) => Point | null;

const xSignFlip: DistractorFn = (p) => (p.x !== 0 ? { x: -p.x, y: p.y } : null);
const ySignFlip: DistractorFn = (p) => (p.y !== 0 ? { x: p.x, y: -p.y } : null);
const bothSignFlip: DistractorFn = (p) => (p.x !== 0 && p.y !== 0 ? { x: -p.x, y: -p.y } : null);
const swapXY: DistractorFn = (p) => (p.x !== p.y ? { x: p.y, y: p.x } : null);

const DISTRACTOR_FNS: DistractorFn[] = [xSignFlip, ySignFlip, bothSignFlip, swapXY];

function randomFallbackPoint(used: Set<string>): Point {
  let candidate: Point;
  let guard = 0;
  do {
    candidate = pointAnywhere();
    guard += 1;
  } while (guard < 50 && used.has(key(candidate)));
  return candidate;
}

function buildOptions(correct: Point): FindPointOption[] {
  const used = new Set<string>([key(correct)]);
  const distractors: Point[] = [];

  for (const fn of shuffle(DISTRACTOR_FNS)) {
    if (distractors.length >= 3) break;
    const candidate = fn(correct);
    if (!candidate || !inRange(candidate) || used.has(key(candidate))) continue;
    distractors.push(candidate);
    used.add(key(candidate));
  }

  while (distractors.length < 3) {
    const candidate = randomFallbackPoint(used);
    distractors.push(candidate);
    used.add(key(candidate));
  }

  const points = shuffle([correct, ...distractors]);
  return points.map((point, i) => ({ id: `opt-${i}-${point.x}-${point.y}`, point, label: LABELS[i] }));
}

function buildChallenge(id: string, correct: Point): FindPointChallenge {
  const options = buildOptions(correct);
  const correctOption = options.find((o) => o.point.x === correct.x && o.point.y === correct.y);
  return { id, correct, options, correctOptionId: correctOption?.id ?? options[0].id };
}

function stage1(): FindPointChallenge[] {
  return [0, 1, 2].map((i) => buildChallenge(`stage1-${i}`, pointInQuadrant1()));
}

function stage2(): FindPointChallenge[] {
  // Balanced: one challenge per quadrant instead of independently random picks.
  const quadrants = shuffle([1, 2, 3, 4] as const);
  return quadrants.map((q, i) => buildChallenge(`stage2-${i}`, pointInQuadrant(q)));
}

function stage3(): FindPointChallenge[] {
  // Balanced mix of x-axis and y-axis points.
  const axisChoices = shuffle([true, false, Math.random() < 0.5]);
  return axisChoices.map((onX, i) => buildChallenge(`stage3-${i}`, pointOnAxis(onX)));
}

function stage4(): FindPointChallenge[] {
  const generators = shuffle([
    () => pointInQuadrant1(),
    () => pointInQuadrant(randomInt(1, 4) as 1 | 2 | 3 | 4),
    () => pointOnAxis(Math.random() < 0.5),
  ]);
  return generators.map((gen, i) => buildChallenge(`stage4-${i}`, gen()));
}

export function buildFindThePointStages(): FindPointStageDef[] {
  return [
    { id: 'stage1', nameKey: 'findThePoint.stages.stage1.name', introKey: 'findThePoint.stages.stage1.intro', challenges: stage1() },
    { id: 'stage2', nameKey: 'findThePoint.stages.stage2.name', introKey: 'findThePoint.stages.stage2.intro', challenges: stage2() },
    { id: 'stage3', nameKey: 'findThePoint.stages.stage3.name', introKey: 'findThePoint.stages.stage3.intro', challenges: stage3() },
    { id: 'stage4', nameKey: 'findThePoint.stages.stage4.name', introKey: 'findThePoint.stages.stage4.intro', challenges: stage4() },
  ];
}

export const FIND_THE_POINT_TOTAL = 3 + 4 + 3 + 3;
