import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildSignedAddSubChallenges, SIGNED_ADD_SUB_TOTAL } from '../data/games/signedAddSubData';
import { formatSigned } from '../utils/signedNumbers';
import type { AddSubChallenge } from '../types/signedAddSub';

export function useSignedAddSubGame() {
  const pool = useMemo(() => buildSignedAddSubChallenges(), []);

  return useChallengeRound<AddSubChallenge, number>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, value) => value === challenge.result,
    formatAnswer: (value) => formatSigned(value),
    formatCorrectAnswer: (challenge) => formatSigned(challenge.result),
  });
}

export const SIGNED_ADD_SUB_TOTAL_COUNT = SIGNED_ADD_SUB_TOTAL;
