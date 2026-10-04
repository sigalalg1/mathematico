import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildPatternChallenges, PATTERNS_TOTAL, type PatternChallenge } from '../data/games/algebraPatternsData';

export const ALGEBRA_PATTERNS_TOTAL = PATTERNS_TOTAL;

export function useAlgebraPatternsGame() {
  const pool = useMemo(() => buildPatternChallenges(), []);

  return useChallengeRound<PatternChallenge, string>({
    pool,
    count: PATTERNS_TOTAL,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer === challenge.answer,
    formatAnswer: (answer) => answer,
    formatCorrectAnswer: (challenge) => challenge.answer,
    ordered: true,
  });
}
