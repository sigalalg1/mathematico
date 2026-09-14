import type { MissionChallenge, Point } from '../../types/coordinateMission';
import { quadrantSigns } from './quadrantChallengeData';
import type { QuadrantId } from '../../types/quadrantChallenge';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNonZero(min: number, max: number): number {
  let value = 0;
  while (value === 0) value = randomInt(min, max);
  return value;
}

function pointInQuadrant(quadrant: QuadrantId): Point {
  const magX = randomInt(1, 5);
  const magY = randomInt(1, 5);
  const signs = quadrantSigns[quadrant];
  return { x: signs.x === '+' ? magX : -magX, y: signs.y === '+' ? magY : -magY };
}

export function buildCoordinateMissionChallenges(): MissionChallenge[] {
  const quadrantForIdentify: QuadrantId = (randomInt(1, 4) as QuadrantId);
  const quadrantForSigns: QuadrantId = (randomInt(1, 4) as QuadrantId);
  const readTarget = pointInQuadrant(randomInt(1, 4) as QuadrantId);
  const placeTarget = pointInQuadrant(randomInt(1, 4) as QuadrantId);
  const rectWidth = randomInt(2, 4);
  const rectHeight = randomInt(2, 4);
  // Anchor the rectangle so its far corner still fits inside the -5..5 grid.
  const rx = randomInt(-5, 5 - rectWidth);
  const ry = randomInt(-5, 5 - rectHeight);
  const rectangleVertices: [Point, Point, Point, Point] = [
    { x: rx, y: ry },
    { x: rx + rectWidth, y: ry },
    { x: rx + rectWidth, y: ry + rectHeight },
    { x: rx, y: ry + rectHeight },
  ];

  const segAxis = Math.random() < 0.5;
  // The two endpoints must differ, otherwise the segment collapses to a point
  // and the answer would be 0.
  const sv1 = randomNonZero(-5, 5);
  let sv2 = randomNonZero(-5, 5);
  while (sv2 === sv1) sv2 = randomNonZero(-5, 5);
  const segFixed = randomInt(-4, 4);
  const segmentA: Point = segAxis ? { x: sv1, y: segFixed } : { x: segFixed, y: sv1 };
  const segmentB: Point = segAxis ? { x: sv2, y: segFixed } : { x: segFixed, y: sv2 };

  const mistakeX = randomNonZero(-5, 5);
  const mistakeY = randomNonZero(-5, 5);
  const mistakeTarget: Point = { x: mistakeX, y: mistakeY };
  const mistakeWrong: Point = { x: -mistakeX, y: mistakeY };

  const axisPoint: Point = Math.random() < 0.5 ? { x: randomNonZero(-5, 5), y: 0 } : { x: 0, y: randomNonZero(-5, 5) };

  return [
    {
      id: 'mission-identifyAxis',
      kind: 'identifyAxis',
      promptKey: 'coordinateMission.prompts.identifyAxis',
      correctAxis: 'yAxis',
    },
    {
      id: 'mission-readCoordinate',
      kind: 'readCoordinate',
      promptKey: 'coordinateMission.prompts.readCoordinate',
      point: readTarget,
      correctPoint: readTarget,
    },
    {
      id: 'mission-placePoint',
      kind: 'placePoint',
      promptKey: 'coordinateMission.prompts.placePoint',
      pair: placeTarget,
      correctPoint: placeTarget,
    },
    {
      id: 'mission-quadrant',
      kind: 'quadrant',
      promptKey: 'coordinateMission.prompts.quadrant',
      point: pointInQuadrant(quadrantForIdentify),
      correctQuadrant: quadrantForIdentify,
    },
    {
      id: 'mission-quadrantFromSigns',
      kind: 'quadrant',
      promptKey: 'coordinateMission.prompts.quadrantFromSigns',
      pair: { x: quadrantSigns[quadrantForSigns].x === '+' ? 1 : -1, y: quadrantSigns[quadrantForSigns].y === '+' ? 1 : -1 },
      correctQuadrant: quadrantForSigns,
    },
    {
      id: 'mission-axisOrQuadrant',
      kind: 'axisOrQuadrant',
      promptKey: 'coordinateMission.prompts.axisOrQuadrant',
      pair: axisPoint,
      correctChoice: axisPoint.x === 0 ? 'yAxis' : 'xAxis',
      choiceOptions: [
        { id: 1, labelKey: 'quadrantChallenge.locations.quadrant1' },
        { id: 'xAxis', labelKey: 'quadrantChallenge.locations.xAxis' },
        { id: 'yAxis', labelKey: 'quadrantChallenge.locations.yAxis' },
      ] as MissionChallenge['choiceOptions'],
    },
    {
      id: 'mission-detectMistake',
      kind: 'detectMistake',
      promptKey: 'coordinateMission.prompts.detectMistake',
      point: mistakeTarget,
      wrongAnswer: mistakeWrong,
      correctChoice: 'xSignError',
      choiceOptions: [
        { id: 'xSignError', labelKey: 'coordinateDetective.categories.xSignError' },
        { id: 'ySignError', labelKey: 'coordinateDetective.categories.ySignError' },
        { id: 'swappedXY', labelKey: 'coordinateDetective.categories.swappedXY' },
      ] as MissionChallenge['choiceOptions'],
    },
    {
      id: 'mission-segment',
      kind: 'segment',
      promptKey: 'coordinateMission.prompts.segment',
      segmentA,
      segmentB,
      correctLength: Math.abs(sv1 - sv2),
    },
    {
      id: 'mission-completeRectangle',
      kind: 'completeRectangle',
      promptKey: 'coordinateMission.prompts.completeRectangle',
      rectangleVertices,
      correctPoint: rectangleVertices[3],
    },
  ];
}

export const COORDINATE_MISSION_TOTAL = 9;
