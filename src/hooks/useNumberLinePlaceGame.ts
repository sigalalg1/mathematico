import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildNumberLinePlaceChallenges, NUMBER_LINE_PLACE_TOTAL } from '../data/games/numberLinePlaceData';
import { formatSigned } from '../utils/signedNumbers';
import type { PlaceChallenge } from '../types/numberLinePlace';

export function useNumberLinePlaceGame() {
  const pool = useMemo(() => buildNumberLinePlaceChallenges(), []);

  return useChallengeRound<PlaceChallenge, number>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, value) => value === challenge.target,
    formatAnswer: (value) => formatSigned(value),
    formatCorrectAnswer: (challenge) => formatSigned(challenge.target),
  });
}

export const NUMBER_LINE_PLACE_TOTAL_COUNT = NUMBER_LINE_PLACE_TOTAL;
