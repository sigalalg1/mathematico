import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildShapesOnPlaneStages, SHAPES_ON_PLANE_TOTAL } from '../data/games/shapesOnPlaneData';
import type { ShapeAnswer, ShapeChallenge } from '../types/shapesOnPlane';

function checkAnswer(challenge: ShapeChallenge, answer: ShapeAnswer): boolean {
  if (challenge.kind === 'completeShape') {
    if (answer.kind !== 'point' || challenge.missingIndex === undefined) return false;
    const missing = challenge.vertices[challenge.missingIndex];
    return answer.value.x === missing.x && answer.value.y === missing.y;
  }
  return answer.kind === 'number' && answer.value === challenge.answerNumber;
}

function formatAnswer(answer: ShapeAnswer): string {
  return answer.kind === 'point' ? `(${answer.value.x}, ${answer.value.y})` : String(answer.value);
}

function formatCorrect(challenge: ShapeChallenge): string {
  if (challenge.kind === 'completeShape' && challenge.missingIndex !== undefined) {
    const missing = challenge.vertices[challenge.missingIndex];
    return `(${missing.x}, ${missing.y})`;
  }
  return String(challenge.answerNumber);
}

export function useShapesOnPlaneGame() {
  const stages = useMemo(() => buildShapesOnPlaneStages(), []);
  const pool = useMemo(() => stages.flatMap((stage) => stage.challenges), [stages]);

  const round = useChallengeRound<ShapeChallenge, ShapeAnswer>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer,
    formatAnswer,
    formatCorrectAnswer: formatCorrect,
  });

  const stageId = round.challenge.id.split('-')[0];
  const stageIndex = stages.findIndex((stage) => stage.id === stageId);

  return { ...round, stages, stage: stages[stageIndex] ?? stages[0], stageIndex: Math.max(stageIndex, 0) };
}

export const SHAPES_ON_PLANE_TOTAL_COUNT = SHAPES_ON_PLANE_TOTAL;
