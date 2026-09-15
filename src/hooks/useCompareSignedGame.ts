import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildCompareSignedChallenges, COMPARE_SIGNED_TOTAL } from '../data/games/compareSignedData';
import { formatSigned } from '../utils/signedNumbers';
import type { CompareChallenge } from '../types/compareSigned';

export function useCompareSignedGame() {
  const pool = useMemo(() => buildCompareSignedChallenges(), []);

  return useChallengeRound<CompareChallenge, number>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, value) => value === challenge.answer,
    formatAnswer: (value) => formatSigned(value),
    formatCorrectAnswer: (challenge) => formatSigned(challenge.answer),
  });
}

export const COMPARE_SIGNED_TOTAL_COUNT = COMPARE_SIGNED_TOTAL;
