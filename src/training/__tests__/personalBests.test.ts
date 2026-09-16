import { describe, expect, it } from 'vitest';
import { compareWithPersonalBest, derivePersonalBest, isPaceEligible } from '../personalBests';
import { configurationKey, isChallengeEligible, resolveConfiguration, sameConfiguration } from '../configuration';
import { multiplicationTablesActivity } from '../../data/games/multiplicationTablesData';
import type { TrainingConfiguration, TrainingSessionResult } from '../../types/training';

const BASE_CONFIG: TrainingConfiguration = {
  activityId: 'multiplicationTables',
  difficultyId: 'basic',
  questionCount: 20,
  rulesVersion: 1,
};

/** The multiplication activity's rule: a pace record requires a flawless run. */
const PACE_MIN_ACCURACY = multiplicationTablesActivity.capabilities.paceRecordMinAccuracy;

let sequence = 0;

function makeResult(
  overrides: Partial<TrainingSessionResult> & { correctCount: number; longestStreak: number; averageMsPerQuestion: number },
): TrainingSessionResult {
  sequence += 1;
  const totalQuestions = overrides.totalQuestions ?? 20;
  return {
    id: `result-${sequence}`,
    configuration: overrides.configuration ?? BASE_CONFIG,
    mode: 'challenge',
    startedAt: `2026-01-0${sequence}T10:00:00.000Z`,
    completedAt: `2026-01-0${sequence}T10:02:00.000Z`,
    totalDurationMs: 120_000,
    answeringDurationMs: overrides.averageMsPerQuestion * totalQuestions,
    totalQuestions,
    correctCount: overrides.correctCount,
    incorrectCount: totalQuestions - overrides.correctCount,
    accuracy: overrides.correctCount / totalQuestions,
    longestStreak: overrides.longestStreak,
    averageMsPerQuestion: overrides.averageMsPerQuestion,
  };
}

describe('challenge configurations', () => {
  it('keys a record by activity, difficulty, question count and rules version', () => {
    expect(configurationKey(BASE_CONFIG)).toBe('multiplicationTables|basic|20|v1');
  });

  it('does not share records between different question counts', () => {
    expect(sameConfiguration(BASE_CONFIG, { ...BASE_CONFIG, questionCount: 50 })).toBe(false);
  });

  it('does not share records between different difficulty levels', () => {
    expect(sameConfiguration(BASE_CONFIG, { ...BASE_CONFIG, difficultyId: 'hard' })).toBe(false);
  });

  it('does not share records across a rules-version bump', () => {
    expect(sameConfiguration(BASE_CONFIG, { ...BASE_CONFIG, rulesVersion: 2 })).toBe(false);
  });

  it('falls back to supported values when a choice is not offered', () => {
    const resolved = resolveConfiguration('multiplicationTables', multiplicationTablesActivity.capabilities, {
      difficultyId: 'impossible',
      questionCount: 999,
    });
    expect(resolved.difficultyId).toBe('basic');
    expect(resolved.questionCount).toBe(multiplicationTablesActivity.capabilities.defaultQuestionCount);
  });

  it('only offers a personal challenge at the lengths the activity declares', () => {
    const { capabilities } = multiplicationTablesActivity;
    expect(isChallengeEligible(capabilities, 5)).toBe(false);
    expect(isChallengeEligible(capabilities, 10)).toBe(false);
    expect(isChallengeEligible(capabilities, 20)).toBe(true);
    expect(isChallengeEligible(capabilities, 50)).toBe(true);
  });
});

describe('personal bests', () => {
  it('has nothing to report without history', () => {
    expect(derivePersonalBest([], PACE_MIN_ACCURACY)).toBeNull();
  });

  it('derives each dimension independently from the stored results', () => {
    const best = derivePersonalBest(
      [
        makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 4000 }),
        makeResult({ correctCount: 18, longestStreak: 14, averageMsPerQuestion: 2000 }),
      ],
      PACE_MIN_ACCURACY,
    );

    expect(best?.attempts).toBe(2);
    expect(best?.bestAccuracy).toBe(1);
    expect(best?.bestLongestStreak).toBe(20);
    // The 2000ms run had mistakes, so the flawless 4000ms run holds the pace record.
    expect(best?.bestAverageMsPerQuestion).toBe(4000);
  });

  it('leaves the pace record empty until a session clears the accuracy bar', () => {
    const best = derivePersonalBest(
      [makeResult({ correctCount: 19, longestStreak: 12, averageMsPerQuestion: 1500 })],
      PACE_MIN_ACCURACY,
    );
    expect(best?.bestAverageMsPerQuestion).toBeNull();
  });

  it('applies the activity-configured threshold rather than a platform-wide rule', () => {
    const nearlyPerfect = makeResult({ correctCount: 19, longestStreak: 12, averageMsPerQuestion: 1500 });
    expect(isPaceEligible(nearlyPerfect, 1)).toBe(false);
    expect(isPaceEligible(nearlyPerfect, 0.9)).toBe(true);
  });
});

describe('comparing a result with the previous bests', () => {
  it('treats a first attempt as a baseline rather than a record', () => {
    const improvement = compareWithPersonalBest(
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3000 }),
      null,
      PACE_MIN_ACCURACY,
    );

    expect(improvement.isFirstAttempt).toBe(true);
    expect(improvement.accuracy.isRecord).toBe(false);
    expect(improvement.pace.isRecord).toBe(false);
    expect(improvement.streak.isRecord).toBe(false);
    expect(improvement.accuracy.previousBest).toBeNull();
  });

  it('does not replace a pace record with a slower attempt', () => {
    const previous = derivePersonalBest(
      [makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2500 })],
      PACE_MIN_ACCURACY,
    );
    const improvement = compareWithPersonalBest(
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3200 }),
      previous,
      PACE_MIN_ACCURACY,
    );

    expect(improvement.pace.isEligible).toBe(true);
    expect(improvement.pace.isRecord).toBe(false);
    expect(improvement.pace.previousBest).toBe(2500);
  });

  it('replaces the pace record with a faster flawless attempt', () => {
    const previous = derivePersonalBest(
      [makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3200 })],
      PACE_MIN_ACCURACY,
    );
    const improvement = compareWithPersonalBest(
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2900 }),
      previous,
      PACE_MIN_ACCURACY,
    );

    expect(improvement.pace.isRecord).toBe(true);
    expect(improvement.pace.improvement).toBe(300);
  });

  it('never celebrates a faster but less accurate attempt as a speed record', () => {
    const previous = derivePersonalBest(
      [makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3200 })],
      PACE_MIN_ACCURACY,
    );
    const improvement = compareWithPersonalBest(
      makeResult({ correctCount: 16, longestStreak: 9, averageMsPerQuestion: 1200 }),
      previous,
      PACE_MIN_ACCURACY,
    );

    expect(improvement.pace.isEligible).toBe(false);
    expect(improvement.pace.isRecord).toBe(false);
    expect(improvement.pace.previousBest).toBe(3200);
  });

  it('reports an improved streak as a record with the size of the gain', () => {
    const previous = derivePersonalBest(
      [makeResult({ correctCount: 17, longestStreak: 11, averageMsPerQuestion: 3000 })],
      PACE_MIN_ACCURACY,
    );
    const improvement = compareWithPersonalBest(
      makeResult({ correctCount: 18, longestStreak: 15, averageMsPerQuestion: 3000 }),
      previous,
      PACE_MIN_ACCURACY,
    );

    expect(improvement.streak.isRecord).toBe(true);
    expect(improvement.streak.improvement).toBe(4);
    expect(improvement.accuracy.isRecord).toBe(true);
  });

  it('does not flag an equal result as a new record', () => {
    const previous = derivePersonalBest(
      [makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3000 })],
      PACE_MIN_ACCURACY,
    );
    const improvement = compareWithPersonalBest(
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3000 }),
      previous,
      PACE_MIN_ACCURACY,
    );

    expect(improvement.accuracy.isRecord).toBe(false);
    expect(improvement.streak.isRecord).toBe(false);
    expect(improvement.pace.isRecord).toBe(false);
  });
});
