import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildEquivalenceChallenges, EQUIVALENT_TOTAL, type EquivalenceChallenge } from '../data/games/algebraEquivalentData';

export const ALGEBRA_EQUIVALENT_TOTAL = EQUIVALENT_TOTAL;

export function useAlgebraEquivalentGame() {
  const pool = useMemo(() => buildEquivalenceChallenges(), []);

  return useChallengeRound<EquivalenceChallenge, boolean>({
    pool,
    count: EQUIVALENT_TOTAL,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer === challenge.equivalent,
    formatAnswer: (answer) => (answer ? 'equivalent' : 'notEquivalent'),
    formatCorrectAnswer: (challenge) => (challenge.equivalent ? 'equivalent' : 'notEquivalent'),
    ordered: true,
  });
}
