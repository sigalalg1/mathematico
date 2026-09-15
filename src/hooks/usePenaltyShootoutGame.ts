import { useMemo } from 'react';
import { buildPenaltyShootoutMatch, PENALTY_SHOOTOUT_COUNT } from '../data/games/penaltyShootoutData';
import type { ShootoutAnswer, ShootoutQuestion } from '../types/penaltyShootout';
import { useChallengeRound } from './useChallengeRound';

export function usePenaltyShootoutGame() {
  const pool = useMemo(() => buildPenaltyShootoutMatch(), []);
  return useChallengeRound<ShootoutQuestion, ShootoutAnswer>({
    pool,
    count: PENALTY_SHOOTOUT_COUNT,
    ordered: true,
    getId: (question) => question.id,
    checkAnswer: (question, answer) => answer.value === question.answer,
    formatAnswer: (answer) => String(answer.value),
    formatCorrectAnswer: (question) => String(question.answer),
  });
}
