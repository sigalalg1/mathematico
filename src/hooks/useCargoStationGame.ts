import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildCargoStationStages, CARGO_STATION_TOTAL } from '../data/games/cargoStationData';
import type { CargoAnswer, CargoChallenge } from '../types/cargoStation';

function checkAnswer(challenge: CargoChallenge, answer: CargoAnswer): boolean {
  return answer.quotient === challenge.quotient && answer.remainder === challenge.remainder;
}

function formatAnswer(answer: CargoAnswer): string {
  return `${answer.quotient} r ${answer.remainder}`;
}

function formatCorrect(challenge: CargoChallenge): string {
  return `${challenge.quotient} r ${challenge.remainder}`;
}

export function useCargoStationGame() {
  const stages = useMemo(() => buildCargoStationStages(), []);
  const pool = useMemo(() => stages.flatMap((stage) => stage.challenges), [stages]);

  const round = useChallengeRound<CargoChallenge, CargoAnswer>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer,
    formatAnswer,
    formatCorrectAnswer: formatCorrect,
  });

  const stageIndex = stages.findIndex((stage) => stage.id === round.challenge.stageId);

  return { ...round, stages, stage: stages[stageIndex] ?? stages[0], stageIndex: Math.max(stageIndex, 0) };
}

export const CARGO_STATION_TOTAL_COUNT = CARGO_STATION_TOTAL;
