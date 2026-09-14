import type { LaunchStageId } from '../../types/launchSpaceship';
import type { TargetPoint } from '../../types/hitTheTarget';

export interface LaunchStageDef {
  id: LaunchStageId;
  nameKey: string;
  introKey: string;
  count: number;
  mode: 'guided' | 'direct';
}

export const launchSpaceshipStages: LaunchStageDef[] = [
  { id: 'stage1', nameKey: 'launchSpaceship.stages.stage1.name', introKey: 'launchSpaceship.stages.stage1.intro', count: 5, mode: 'guided' },
  { id: 'stage2', nameKey: 'launchSpaceship.stages.stage2.name', introKey: 'launchSpaceship.stages.stage2.intro', count: 5, mode: 'guided' },
  { id: 'stage3', nameKey: 'launchSpaceship.stages.stage3.name', introKey: 'launchSpaceship.stages.stage3.intro', count: 4, mode: 'guided' },
  { id: 'stage4', nameKey: 'launchSpaceship.stages.stage4.name', introKey: 'launchSpaceship.stages.stage4.intro', count: 4, mode: 'direct' },
];

export const LAUNCH_RANGE_MIN = -5;
export const LAUNCH_RANGE_MAX = 5;

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

function generateForStage(stageId: LaunchStageId): TargetPoint {
  const min = LAUNCH_RANGE_MIN;
  const max = LAUNCH_RANGE_MAX;

  switch (stageId) {
    case 'stage1':
      return { x: randomInt(1, max), y: randomInt(1, max) };
    case 'stage2':
    case 'stage4':
      return { x: randomNonZeroInt(min, max), y: randomNonZeroInt(min, max) };
    case 'stage3':
      return Math.random() < 0.5
        ? { x: randomNonZeroInt(min, max), y: 0 }
        : { x: 0, y: randomNonZeroInt(min, max) };
  }
}

/** Picks the next destination for a stage, avoiding repeats and points too close to the previous one. */
export function generateDestination(stageId: LaunchStageId, previous: TargetPoint[]): TargetPoint {
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

export function buildStageDestinations(stageId: LaunchStageId, count: number): TargetPoint[] {
  const destinations: TargetPoint[] = [];
  for (let i = 0; i < count; i++) {
    destinations.push(generateDestination(stageId, destinations));
  }
  return destinations;
}

export const LAUNCH_SPACESHIP_TOTAL = launchSpaceshipStages.reduce((sum, stage) => sum + stage.count, 0);
