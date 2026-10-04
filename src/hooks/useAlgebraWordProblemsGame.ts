import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import {
  buildWordProblemChallenges,
  WORD_PROBLEMS_TOTAL,
  type WordProblemChallenge,
} from '../data/games/algebraWordProblemsData';

export const ALGEBRA_WORD_PROBLEMS_TOTAL = WORD_PROBLEMS_TOTAL;

export function useAlgebraWordProblemsGame() {
  const pool = useMemo(() => buildWordProblemChallenges(), []);

  return useChallengeRound<WordProblemChallenge, string>({
    pool,
    count: WORD_PROBLEMS_TOTAL,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer === challenge.answer,
    formatAnswer: (answer) => answer,
    formatCorrectAnswer: (challenge) => challenge.answer,
    ordered: true,
  });
}
