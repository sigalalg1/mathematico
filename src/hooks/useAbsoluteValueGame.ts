import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { ABSOLUTE_VALUE_TOTAL, buildAbsoluteValueChallenges } from '../data/games/absoluteValueData';
import { formatSigned } from '../utils/signedNumbers';
import type { AbsoluteChallenge } from '../types/absoluteValue';

export function useAbsoluteValueGame() {
  const pool = useMemo(() => buildAbsoluteValueChallenges(), []);

  return useChallengeRound<AbsoluteChallenge, number>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, value) => value === challenge.answer,
    formatAnswer: (value) => formatSigned(value),
    formatCorrectAnswer: (challenge) => formatSigned(challenge.answer),
  });
}

export const ABSOLUTE_VALUE_TOTAL_COUNT = ABSOLUTE_VALUE_TOTAL;
