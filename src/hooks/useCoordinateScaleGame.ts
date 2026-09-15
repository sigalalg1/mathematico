import { useMemo } from 'react';
import { useChallengeRound } from './useChallengeRound';
import { buildCoordinateScaleChallenges, COORDINATE_SCALE_TOTAL, formatScaleValue } from '../data/games/coordinateScaleData';
import type { Point, ScaleChallenge, ScaleOption } from '../types/coordinateScale';

export interface ScaleAnswer {
  optionId: string;
  /** Where the student clicked, in grid squares. */
  tick: Point;
  /** What that position really means at this question's scale. */
  value: Point;
  option: ScaleOption;
  display: string;
}

/** How a position reads to the student: a single value on an axis, or an ordered pair. */
export function describePosition(challenge: ScaleChallenge, tick: Point): string {
  const value = { x: tick.x * challenge.scale, y: tick.y * challenge.scale };
  if (challenge.kind === 'axisValue') {
    return formatScaleValue(challenge.axis === 'y' ? value.y : value.x);
  }
  return `(${formatScaleValue(value.x)}, ${formatScaleValue(value.y)})`;
}

export function toAnswer(challenge: ScaleChallenge, option: ScaleOption): ScaleAnswer {
  return {
    optionId: option.id,
    tick: option.tick,
    value: { x: option.tick.x * challenge.scale, y: option.tick.y * challenge.scale },
    option,
    display: describePosition(challenge, option.tick),
  };
}

export function useCoordinateScaleGame() {
  const pool = useMemo(() => buildCoordinateScaleChallenges(), []);

  return useChallengeRound<ScaleChallenge, ScaleAnswer>({
    pool,
    count: pool.length,
    ordered: true,
    getId: (challenge) => challenge.id,
    checkAnswer: (challenge, answer) => answer.optionId === challenge.correctOptionId,
    formatAnswer: (answer) => answer.display,
    formatCorrectAnswer: (challenge) => describePosition(challenge, challenge.targetTick),
  });
}

export const COORDINATE_SCALE_TOTAL_COUNT = COORDINATE_SCALE_TOTAL;
