import { useMemo, useState } from 'react';
import { generateFractionActivity, isFractionChallengeCorrect } from '../data/games/fractionsPart1Data';
import type { FractionActivityId, FractionChallenge } from '../types/fractionsPart1';
import { useChallengeRound } from './useChallengeRound';

export function useFractionsPart1Game(activityId: FractionActivityId) {
  const [seed] = useState(() => Date.now() ^ activityId.length * 2654435761);
  const challenges = useMemo(() => generateFractionActivity(activityId, seed), [activityId, seed]);
  return useChallengeRound<FractionChallenge, string>({
    pool: challenges,
    count: challenges.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: isFractionChallengeCorrect,
    formatAnswer: String,
    formatCorrectAnswer: (challenge) => challenge.correctAnswer,
  });
}
