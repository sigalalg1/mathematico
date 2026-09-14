import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildFindThePointStages, FIND_THE_POINT_TOTAL } from '../data/games/findThePointData';
import type { FindPointChallenge, Point } from '../types/findThePoint';

function checkAnswer(challenge: FindPointChallenge, answer: Point): boolean {
  return answer.x === challenge.correct.x && answer.y === challenge.correct.y;
}

function formatPoint(point: Point): string {
  return `(${point.x}, ${point.y})`;
}

export function useFindThePointGame() {
  const stages = useMemo(() => buildFindThePointStages(), []);
  const pool = useMemo(() => stages.flatMap((stage) => stage.challenges), [stages]);

  const round = useChallengeRound<FindPointChallenge, Point>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer,
    formatAnswer: formatPoint,
    formatCorrectAnswer: (challenge) => formatPoint(challenge.correct),
  });

  const stageId = round.challenge.id.split('-')[0];
  const stageIndex = stages.findIndex((stage) => stage.id === stageId);

  return { ...round, stages, stage: stages[stageIndex] ?? stages[0], stageIndex: Math.max(stageIndex, 0) };
}

export const FIND_THE_POINT_TOTAL_COUNT = FIND_THE_POINT_TOTAL;
