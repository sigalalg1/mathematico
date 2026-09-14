import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildCoordinateDetectiveChallenges, COORDINATE_DETECTIVE_TOTAL } from '../data/games/coordinateDetectiveData';
import type { DetectiveChallenge, MistakeCategory } from '../types/coordinateDetective';

export function useCoordinateDetectiveGame() {
  const pool = useMemo(() => buildCoordinateDetectiveChallenges(), []);

  return useChallengeRound<DetectiveChallenge, MistakeCategory>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer === challenge.category,
    formatAnswer: (answer) => answer,
    formatCorrectAnswer: (challenge) => challenge.category,
  });
}

export const COORDINATE_DETECTIVE_TOTAL_COUNT = COORDINATE_DETECTIVE_TOTAL;
