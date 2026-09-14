import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildCoordinateMissionChallenges, COORDINATE_MISSION_TOTAL } from '../data/games/coordinateMissionData';
import type { MissionAnswer, MissionChallenge } from '../types/coordinateMission';

function checkAnswer(challenge: MissionChallenge, answer: MissionAnswer): boolean {
  switch (challenge.kind) {
    case 'identifyAxis':
      return answer.kind === 'axis' && answer.value === challenge.correctAxis;
    case 'readCoordinate':
      return answer.kind === 'coords' && answer.x === challenge.correctPoint?.x && answer.y === challenge.correctPoint?.y;
    case 'placePoint':
    case 'completeRectangle':
      return answer.kind === 'point' && answer.value.x === challenge.correctPoint?.x && answer.value.y === challenge.correctPoint?.y;
    case 'quadrant':
      return answer.kind === 'quadrant' && answer.value === challenge.correctQuadrant;
    case 'axisOrQuadrant':
    case 'detectMistake':
      return answer.kind === 'choice' && answer.value === challenge.correctChoice;
    case 'segment':
      return answer.kind === 'number' && answer.value === challenge.correctLength;
    default:
      return false;
  }
}

function formatAnswer(answer: MissionAnswer): string {
  if (answer.kind === 'point') return `(${answer.value.x}, ${answer.value.y})`;
  if (answer.kind === 'coords') return `(${answer.x}, ${answer.y})`;
  if (answer.kind === 'choice' || answer.kind === 'axis') return String(answer.value);
  if (answer.kind === 'quadrant') return `Q${answer.value}`;
  return String(answer.value);
}

function formatCorrect(challenge: MissionChallenge): string {
  if (challenge.correctPoint) return `(${challenge.correctPoint.x}, ${challenge.correctPoint.y})`;
  if (challenge.correctAxis) return challenge.correctAxis;
  if (challenge.correctQuadrant) return `Q${challenge.correctQuadrant}`;
  if (challenge.correctChoice) return String(challenge.correctChoice);
  if (challenge.correctLength !== undefined) return String(challenge.correctLength);
  return '';
}

export function useCoordinateMissionGame() {
  const pool = useMemo(() => buildCoordinateMissionChallenges(), []);

  return useChallengeRound<MissionChallenge, MissionAnswer>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer,
    formatAnswer,
    formatCorrectAnswer: formatCorrect,
  });
}

export const COORDINATE_MISSION_TOTAL_COUNT = COORDINATE_MISSION_TOTAL;

/** Very small rule-based "practice this again" suggestion from what the student missed. */
export function recommendGameFromMistakes(mistakeQuestionIds: string[]): { nameKey: string; path: string } | null {
  const hasKind = (kind: string) => mistakeQuestionIds.some((id) => id.toLowerCase().includes(kind.toLowerCase()));

  if (hasKind('quadrant') || hasKind('axisOrQuadrant')) {
    return { nameKey: 'quadrantChallenge.gameName', path: '/grade/7/coordinate-system/quadrant-challenge' };
  }
  if (hasKind('detectMistake')) {
    return { nameKey: 'coordinateDetective.gameName', path: '/grade/7/coordinate-system/coordinate-detective' };
  }
  if (hasKind('segment')) {
    return { nameKey: 'distancesSegments.gameName', path: '/grade/7/coordinate-system/distances-segments' };
  }
  if (hasKind('completeRectangle')) {
    return { nameKey: 'shapesOnPlane.gameName', path: '/grade/7/coordinate-system/shapes-on-plane' };
  }
  return null;
}
