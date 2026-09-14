import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildQuadrantChallengeStages, QUADRANT_CHALLENGE_TOTAL } from '../data/games/quadrantChallengeData';
import type { QuadrantAnswer, QuadrantChallenge, QuadrantLocation } from '../types/quadrantChallenge';

function formatLocation(location: QuadrantLocation | undefined): string {
  if (location === undefined) return '';
  return typeof location === 'number' ? `Q${location}` : location;
}

function formatAnswer(answer: QuadrantAnswer): string {
  if (answer.kind === 'signs') return `x:${answer.x},y:${answer.y}`;
  return formatLocation(answer.value);
}

function formatCorrect(challenge: QuadrantChallenge): string {
  if (challenge.kind === 'signs' && challenge.correctSigns) {
    return `x:${challenge.correctSigns.x},y:${challenge.correctSigns.y}`;
  }
  return formatLocation(challenge.correctLocation);
}

function checkAnswer(challenge: QuadrantChallenge, answer: QuadrantAnswer): boolean {
  if (challenge.kind === 'signs' && answer.kind === 'signs') {
    return answer.x === challenge.correctSigns?.x && answer.y === challenge.correctSigns?.y;
  }
  if ((challenge.kind === 'click' || challenge.kind === 'choice') && answer.kind !== 'signs') {
    return answer.value === challenge.correctLocation;
  }
  return false;
}

export function useQuadrantChallengeGame() {
  const stages = useMemo(() => buildQuadrantChallengeStages(), []);
  const pool = useMemo(() => stages.flatMap((stage) => stage.challenges), [stages]);

  const round = useChallengeRound<QuadrantChallenge, QuadrantAnswer>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer,
    formatAnswer,
    formatCorrectAnswer: formatCorrect,
  });

  const stageId = round.challenge.id.split('-')[0];
  const stageIndex = stages.findIndex((stage) => stage.id === stageId);

  return { ...round, stages, stage: stages[stageIndex] ?? stages[0], stageIndex: Math.max(stageIndex, 0) };
}

export const QUADRANT_CHALLENGE_TOTAL_COUNT = QUADRANT_CHALLENGE_TOTAL;
