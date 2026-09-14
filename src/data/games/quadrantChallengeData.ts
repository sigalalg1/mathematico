import type { QuadrantChallenge, QuadrantId, Sign } from '../../types/quadrantChallenge';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pointInQuadrant(quadrant: QuadrantId): { x: number; y: number } {
  const magX = randomInt(1, 5);
  const magY = randomInt(1, 5);
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

export const quadrantSigns: Record<QuadrantId, { x: Sign; y: Sign }> = {
  1: { x: '+', y: '+' },
  2: { x: '-', y: '+' },
  3: { x: '-', y: '-' },
  4: { x: '+', y: '-' },
};

const QUADRANTS: QuadrantId[] = [1, 2, 3, 4];

function stage1(): QuadrantChallenge[] {
  return QUADRANTS.map((q) => ({
    id: `stage1-q${q}`,
    kind: 'click',
    promptKey: 'quadrantChallenge.prompts.whichQuadrant',
    point: pointInQuadrant(q),
    correctLocation: q,
  }));
}

function stage2(): QuadrantChallenge[] {
  return QUADRANTS.map((q) => ({
    id: `stage2-q${q}`,
    kind: 'click',
    promptKey: 'quadrantChallenge.prompts.whichQuadrant',
    pair: pointInQuadrant(q),
    correctLocation: q,
  }));
}

function stage3(): QuadrantChallenge[] {
  return QUADRANTS.map((q) => ({
    id: `stage3-q${q}`,
    kind: 'click',
    promptKey: 'quadrantChallenge.prompts.whichQuadrantFromSigns',
    showSignsText: true,
    pair: { x: quadrantSigns[q].x === '+' ? 1 : -1, y: quadrantSigns[q].y === '+' ? 1 : -1 },
    correctLocation: q,
  }));
}

function stage4(): QuadrantChallenge[] {
  return QUADRANTS.map((q) => ({
    id: `stage4-q${q}`,
    kind: 'signs',
    promptKey: 'quadrantChallenge.prompts.whichSigns',
    highlightQuadrant: q,
    correctSigns: quadrantSigns[q],
  }));
}

function stage5(): QuadrantChallenge[] {
  const options = [
    { id: 1 as const, labelKey: 'quadrantChallenge.locations.quadrant1' },
    { id: 2 as const, labelKey: 'quadrantChallenge.locations.quadrant2' },
    { id: 3 as const, labelKey: 'quadrantChallenge.locations.quadrant3' },
    { id: 4 as const, labelKey: 'quadrantChallenge.locations.quadrant4' },
    { id: 'xAxis' as const, labelKey: 'quadrantChallenge.locations.xAxis' },
    { id: 'yAxis' as const, labelKey: 'quadrantChallenge.locations.yAxis' },
    { id: 'origin' as const, labelKey: 'quadrantChallenge.locations.origin' },
  ];

  const cases: { pair: { x: number; y: number }; correctLocation: QuadrantChallenge['correctLocation'] }[] = [
    { pair: { x: -4, y: 0 }, correctLocation: 'xAxis' },
    { pair: { x: 0, y: 3 }, correctLocation: 'yAxis' },
    { pair: { x: 0, y: -2 }, correctLocation: 'yAxis' },
    { pair: { x: 4, y: 0 }, correctLocation: 'xAxis' },
    { pair: { x: 0, y: 0 }, correctLocation: 'origin' },
  ];

  return cases.map((c, i) => ({
    id: `stage5-${i}`,
    kind: 'choice',
    promptKey: 'quadrantChallenge.prompts.whereIsThisPoint',
    pair: c.pair,
    correctLocation: c.correctLocation,
    options,
  }));
}

export interface QuadrantStageDef {
  id: string;
  nameKey: string;
  introKey: string;
  challenges: QuadrantChallenge[];
}

export function buildQuadrantChallengeStages(): QuadrantStageDef[] {
  return [
    { id: 'stage1', nameKey: 'quadrantChallenge.stages.stage1.name', introKey: 'quadrantChallenge.stages.stage1.intro', challenges: stage1() },
    { id: 'stage2', nameKey: 'quadrantChallenge.stages.stage2.name', introKey: 'quadrantChallenge.stages.stage2.intro', challenges: stage2() },
    { id: 'stage3', nameKey: 'quadrantChallenge.stages.stage3.name', introKey: 'quadrantChallenge.stages.stage3.intro', challenges: stage3() },
    { id: 'stage4', nameKey: 'quadrantChallenge.stages.stage4.name', introKey: 'quadrantChallenge.stages.stage4.intro', challenges: stage4() },
    { id: 'stage5', nameKey: 'quadrantChallenge.stages.stage5.name', introKey: 'quadrantChallenge.stages.stage5.intro', challenges: stage5() },
  ];
}

export const QUADRANT_CHALLENGE_TOTAL = 4 * 4 + 5;
