import type { StageId, TargetPoint } from '../../types/hitTheTarget';

export interface StageDef {
  id: StageId;
  nameKey: string;
  introKey: string;
  count: number;
}

export const hitTheTargetStages: StageDef[] = [
  { id: 'stage1', nameKey: 'hitTheTarget.stages.stage1.name', introKey: 'hitTheTarget.stages.stage1.intro', count: 5 },
  { id: 'stage2', nameKey: 'hitTheTarget.stages.stage2.name', introKey: 'hitTheTarget.stages.stage2.intro', count: 5 },
  { id: 'stage3', nameKey: 'hitTheTarget.stages.stage3.name', introKey: 'hitTheTarget.stages.stage3.intro', count: 5 },
];

export const HIT_THE_TARGET_RANGE_MIN = -5;
export const HIT_THE_TARGET_RANGE_MAX = 5;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNonZeroInt(min: number, max: number): number {
  let value = 0;
  while (value === 0) value = randomInt(min, max);
  return value;
}

function sameTarget(a: TargetPoint, b: TargetPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function isTooClose(a: TargetPoint, b: TargetPoint): boolean {
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
}

function generateForStage(stageId: StageId): TargetPoint {
  const min = HIT_THE_TARGET_RANGE_MIN;
  const max = HIT_THE_TARGET_RANGE_MAX;

  switch (stageId) {
    case 'stage1':
      return { x: randomInt(1, max), y: randomInt(1, max) };
    case 'stage2':
      return { x: randomNonZeroInt(min, max), y: randomNonZeroInt(min, max) };
    case 'stage3':
      return Math.random() < 0.5
        ? { x: randomNonZeroInt(min, max), y: 0 }
        : { x: 0, y: randomNonZeroInt(min, max) };
  }
}

/** Picks the next target for a stage, avoiding repeats and points too close to the previous one. */
export function generateTarget(stageId: StageId, previous: TargetPoint[]): TargetPoint {
  const lastTwo = previous.slice(-2);
  const immediatelyBefore = previous[previous.length - 1];

  let candidate: TargetPoint;
  let guard = 0;
  do {
    candidate = generateForStage(stageId);
    guard += 1;
  } while (
    guard < 50 &&
    (lastTwo.some((point) => sameTarget(point, candidate)) ||
      (immediatelyBefore && isTooClose(immediatelyBefore, candidate)))
  );

  return candidate;
}

export function buildStageTargets(stageId: StageId, count: number): TargetPoint[] {
  const targets: TargetPoint[] = [];
  for (let i = 0; i < count; i++) {
    targets.push(generateTarget(stageId, targets));
  }
  return targets;
}

export const HIT_THE_TARGET_TOTAL = hitTheTargetStages.reduce((sum, stage) => sum + stage.count, 0);
