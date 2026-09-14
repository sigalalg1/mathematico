import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildDistancesSegmentsStages, DISTANCES_SEGMENTS_TOTAL } from '../data/games/distancesSegmentsData';
import type { SegmentChallenge } from '../types/distancesSegments';

export function useDistancesSegmentsGame() {
  const stages = useMemo(() => buildDistancesSegmentsStages(), []);
  const pool = useMemo(() => stages.flatMap((stage) => stage.challenges), [stages]);

  const round = useChallengeRound<SegmentChallenge, number>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer === challenge.length,
    formatAnswer: (answer) => String(answer),
    formatCorrectAnswer: (challenge) => String(challenge.length),
  });

  const stageId = round.challenge.id.split('-')[0];
  const stageIndex = stages.findIndex((stage) => stage.id === stageId);

  return { ...round, stages, stage: stages[stageIndex] ?? stages[0], stageIndex: Math.max(stageIndex, 0) };
}

export const DISTANCES_SEGMENTS_TOTAL_COUNT = DISTANCES_SEGMENTS_TOTAL;
