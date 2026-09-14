import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildMonkeyShooterQuestions } from '../data/games/monkeyBalloonShooterData';
import type { ShooterQuestion } from '../types/monkeyBalloonShooter';

/**
 * One monkey-and-balloons session. Scoring, retry-in-place after a missed shot
 * and completion all come from the shared round engine; the page owns only the
 * timing of the shot, the pop and the monkey's reaction.
 */
export function useMonkeyBalloonShooterGame() {
  const questions = useMemo(() => buildMonkeyShooterQuestions(), []);

  const round = useChallengeRound<ShooterQuestion, number>({
    pool: questions,
    count: questions.length,
    ordered: true,
    getId: (question) => question.id,
    checkAnswer: (question, answer) => answer === question.fact.product,
    formatAnswer: (answer) => String(answer),
    formatCorrectAnswer: (question) => String(question.fact.product),
  });

  return { ...round, question: round.challenge };
}
