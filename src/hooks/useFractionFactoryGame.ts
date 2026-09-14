import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildFractionFactoryOrders, FRACTION_FACTORY_TOTAL } from '../data/games/fractionFactoryData';
import type { FractionAnswer, FractionOrder } from '../types/fractionFactory';

/** An order is only finished when *both* decisions match: the cut and the pieces taken. */
function checkAnswer(order: FractionOrder, answer: FractionAnswer): boolean {
  return answer.denominator === order.denominator && answer.numerator === order.numerator;
}

function formatAnswer(answer: FractionAnswer): string {
  return `${answer.numerator ?? '?'}/${answer.denominator}`;
}

function formatCorrect(order: FractionOrder): string {
  return `${order.numerator}/${order.denominator}`;
}

/**
 * One shift of the Fraction Factory. The round engine owns scoring, retries and
 * completion; the page layers the per-order phases (cut → select → ship) on top,
 * exactly like Cargo Station does for its distribution animation.
 */
export function useFractionFactoryGame() {
  const orders = useMemo(() => buildFractionFactoryOrders(), []);

  const round = useChallengeRound<FractionOrder, FractionAnswer>({
    pool: orders,
    count: orders.length,
    ordered: true,
    getId: (order) => order.id,
    checkAnswer,
    formatAnswer,
    formatCorrectAnswer: formatCorrect,
  });

  return { ...round, order: round.challenge };
}

export const FRACTION_FACTORY_TOTAL_COUNT = FRACTION_FACTORY_TOTAL;
