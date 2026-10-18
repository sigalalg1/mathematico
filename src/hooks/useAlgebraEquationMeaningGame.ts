import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import {
  buildEquationMeaningChallenges,
  EQUATION_MEANING_TOTAL,
  type EquationMeaningChallenge,
} from '../data/games/algebraEquationMeaningData';

export const ALGEBRA_EQUATION_MEANING_TOTAL = EQUATION_MEANING_TOTAL;

export function useAlgebraEquationMeaningGame() {
  const pool = useMemo(() => buildEquationMeaningChallenges(), []);

  return useChallengeRound<EquationMeaningChallenge, string>({
    pool,
    count: EQUATION_MEANING_TOTAL,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer === challenge.answer,
    formatAnswer: (answer) => answer,
    formatCorrectAnswer: (challenge) => challenge.answer,
    ordered: true,
  });
}
