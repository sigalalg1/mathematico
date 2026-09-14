import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildFractionBalloonQuestions, sameFraction } from '../data/games/fractionBalloonsData';
import type { BalloonFraction, BalloonQuestion } from '../types/fractionBalloons';

function format(fraction: BalloonFraction): string {
  return `${fraction.numerator}/${fraction.denominator}`;
}

/**
 * One balloon session. Everything — scoring, retry-in-place after a wrong tap,
 * completion — comes from the shared round engine; the page only owns the
 * animation timing of a popping balloon.
 */
export function useFractionBalloonsGame() {
  const questions = useMemo(() => buildFractionBalloonQuestions(), []);

  const round = useChallengeRound<BalloonQuestion, BalloonFraction>({
    pool: questions,
    count: questions.length,
    ordered: true,
    getId: (question) => question.id,
    checkAnswer: (question, answer) => sameFraction(question.target, answer),
    formatAnswer: format,
    formatCorrectAnswer: (question) => format(question.target),
  });

  return { ...round, question: round.challenge };
}
