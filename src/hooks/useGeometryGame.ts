import { useMemo, useState } from 'react';
import { generateGeometryActivity, isGeometryChallengeCorrect } from '../data/games/geometryAnglesTrianglesData';
import type { GeometryActivityId, GeometryChallenge } from '../types/geometry';
import { useChallengeRound } from './useChallengeRound';

export function useGeometryGame(activityId: GeometryActivityId) {
  const [seed] = useState(() => Date.now() ^ activityId.length * 2654435761);
  const challenges = useMemo(() => generateGeometryActivity(activityId, seed), [activityId, seed]);
  return useChallengeRound<GeometryChallenge, string>({
    pool: challenges,
    count: challenges.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: isGeometryChallengeCorrect,
    formatAnswer: String,
    formatCorrectAnswer: (challenge) => challenge.correctAnswer,
  });
}
