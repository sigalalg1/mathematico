import type { SegmentChallenge } from '../../types/distancesSegments';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function twoDistinctIn(min: number, max: number): [number, number] {
  const a = randomInt(min, max);
  let b = randomInt(min, max);
  while (a === b) b = randomInt(min, max);
  return [a, b];
}

function shuffleAxes(axes: ('x' | 'y')[]): ('x' | 'y')[] {
  const copy = [...axes];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function segmentKey(segment: SegmentChallenge): string {
  return `${segment.axis}-${segment.a.x},${segment.a.y}-${segment.b.x},${segment.b.y}`;
}

function buildSegment(id: string, axis: 'x' | 'y', varyingMin: number, varyingMax: number): SegmentChallenge {
  const [v1, v2] = twoDistinctIn(varyingMin, varyingMax);
  const fixed = randomInt(-4, 4);
  const a = axis === 'x' ? { x: v1, y: fixed } : { x: fixed, y: v1 };
  const b = axis === 'x' ? { x: v2, y: fixed } : { x: fixed, y: v2 };
  return { id, a, b, axis, length: Math.abs(v1 - v2) };
}

/** Builds a segment for the stage while avoiding an exact repeat of an earlier segment in the same round. */
function buildUniqueSegment(id: string, axis: 'x' | 'y', varyingMin: number, varyingMax: number, existing: SegmentChallenge[]): SegmentChallenge {
  const usedKeys = new Set(existing.map(segmentKey));
  let segment: SegmentChallenge;
  let guard = 0;
  do {
    segment = buildSegment(id, axis, varyingMin, varyingMax);
    guard += 1;
  } while (guard < 50 && usedKeys.has(segmentKey(segment)));
  return segment;
}

function buildStageSegments(count: number, prefix: string, axisFor: (i: number) => 'x' | 'y', varyingMin: number, varyingMax: number): SegmentChallenge[] {
  const segments: SegmentChallenge[] = [];
  for (let i = 0; i < count; i++) {
    segments.push(buildUniqueSegment(`${prefix}-${i}`, axisFor(i), varyingMin, varyingMax, segments));
  }
  return segments;
}

export interface SegmentStageDef {
  id: string;
  nameKey: string;
  introKey: string;
  challenges: SegmentChallenge[];
}

export function buildDistancesSegmentsStages(): SegmentStageDef[] {
  const stage1 = buildStageSegments(3, 'stage1', (i) => (i % 2 === 0 ? 'x' : 'y'), 1, 5);
  const stage2 = buildStageSegments(3, 'stage2', (i) => (i % 2 === 0 ? 'x' : 'y'), -5, 5);
  const stage3 = buildStageSegments(3, 'stage3', (i) => (i % 2 === 0 ? 'x' : 'y'), -5, -1);
  // Balance stage 4 across both axes rather than an independent coin-flip per item.
  const stage4Axes = shuffleAxes(['x', 'x', 'y', 'y']);
  const stage4 = buildStageSegments(4, 'stage4', (i) => stage4Axes[i], -5, 5);

  return [
    { id: 'stage1', nameKey: 'distancesSegments.stages.stage1.name', introKey: 'distancesSegments.stages.stage1.intro', challenges: stage1 },
    { id: 'stage2', nameKey: 'distancesSegments.stages.stage2.name', introKey: 'distancesSegments.stages.stage2.intro', challenges: stage2 },
    { id: 'stage3', nameKey: 'distancesSegments.stages.stage3.name', introKey: 'distancesSegments.stages.stage3.intro', challenges: stage3 },
    { id: 'stage4', nameKey: 'distancesSegments.stages.stage4.name', introKey: 'distancesSegments.stages.stage4.intro', challenges: stage4 },
  ];
}

export const DISTANCES_SEGMENTS_TOTAL = 3 + 3 + 3 + 4;
