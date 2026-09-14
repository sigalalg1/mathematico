import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildCargoStationStages, buildQuotientChoices, CARGO_STATION_TOTAL } from '../data/games/cargoStationData';
import type { CargoAnswer, CargoChallenge } from '../types/cargoStation';

function checkAnswer(challenge: CargoChallenge, answer: CargoAnswer): boolean {
  return answer.quotient === Math.floor(challenge.dividend / challenge.divisor);
}

function formatAnswer(answer: CargoAnswer): string {
  return String(answer.quotient);
}

function formatCorrect(challenge: CargoChallenge): string {
  return String(Math.floor(challenge.dividend / challenge.divisor));
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

  // The offered amounts stay fixed while a mission is retried, so a wrong tap
  // never reshuffles the buttons under the child's finger.
  const options = useMemo(
    () => buildQuotientChoices(round.challenge),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round.challenge.id, round.roundKey],
  );

  return { ...round, options, stages, stage: stages[stageIndex] ?? stages[0], stageIndex: Math.max(stageIndex, 0) };
}

export const CARGO_STATION_TOTAL_COUNT = CARGO_STATION_TOTAL;
