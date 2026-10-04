import { describe, expect, it } from 'vitest';
import { buildTrainingRecords, summarizeTrainingResults } from '../records';
import { multiplicationTablesActivity } from '../../data/games/multiplicationTablesData';
import type { TrainingConfiguration, TrainingSessionResult } from '../../types/training';

const BASE_CONFIG: TrainingConfiguration = {
  activityId: 'multiplicationTables',
  difficultyId: 'basic',
  questionCount: 20,
  rulesVersion: multiplicationTablesActivity.capabilities.rulesVersion,
};

let sequence = 0;

function makeResult(
  overrides: Partial<TrainingSessionResult> & { correctCount: number; longestStreak: number; averageMsPerQuestion: number },
): TrainingSessionResult {
  sequence += 1;
  const configuration = overrides.configuration ?? BASE_CONFIG;
  const totalQuestions = overrides.totalQuestions ?? configuration.questionCount;
  return {
    id: `result-${sequence}`,
    configuration,
    mode: 'challenge',
    startedAt: `2026-01-${String(sequence).padStart(2, '0')}T10:00:00.000Z`,
    completedAt: overrides.completedAt ?? `2026-01-${String(sequence).padStart(2, '0')}T10:02:00.000Z`,
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

describe('buildTrainingRecords', () => {
  it('aggregates repeated attempts of the same configuration into a single card', () => {
    const results = [
      makeResult({ correctCount: 18, longestStreak: 10, averageMsPerQuestion: 3200 }),
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 }),
      makeResult({ correctCount: 19, longestStreak: 15, averageMsPerQuestion: 3100 }),
    ];

    const cards = buildTrainingRecords(results);
    expect(cards).toHaveLength(1);
    expect(cards[0].personalBest.attempts).toBe(3);
    // Best pace only counts the flawless run — multiplication requires 100% accuracy.
    expect(cards[0].personalBest.bestAverageMsPerQuestion).toBe(2800);
  });

  it('keeps different question counts as separate records', () => {
    const results = [
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 }),
      makeResult({ configuration: { ...BASE_CONFIG, questionCount: 50 }, correctCount: 50, longestStreak: 50, averageMsPerQuestion: 3000 }),
    ];

    const cards = buildTrainingRecords(results);
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.configuration.questionCount).sort()).toEqual([20, 50]);
  });

  it('keeps different difficulties as separate records', () => {
    const results = [
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 }),
      makeResult({ configuration: { ...BASE_CONFIG, difficultyId: 'hard' }, correctCount: 20, longestStreak: 20, averageMsPerQuestion: 4000 }),
    ];

    const cards = buildTrainingRecords(results);
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.configuration.difficultyId).sort()).toEqual(['basic', 'hard']);
  });

  it('never lets an inaccurate but fast attempt replace an eligible pace record', () => {
    const results = [
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 }),
      // Faster, but not flawless — must not beat the pace record above.
      makeResult({ correctCount: 15, longestStreak: 5, averageMsPerQuestion: 1200 }),
    ];

    const cards = buildTrainingRecords(results);
    expect(cards).toHaveLength(1);
    expect(cards[0].personalBest.bestAverageMsPerQuestion).toBe(2800);
  });

  it('shows a best result even when no attempt was ever pace-eligible', () => {
    const results = [makeResult({ correctCount: 16, longestStreak: 8, averageMsPerQuestion: 3200 })];
    const cards = buildTrainingRecords(results);
    expect(cards[0].personalBest.bestAverageMsPerQuestion).toBeNull();
    expect(cards[0].personalBest.bestAccuracy).toBe(16 / 20);
  });

  it('marks a still-valid configuration as relaunchable, with a launch path', () => {
    const cards = buildTrainingRecords([makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 })]);
    expect(cards[0].isRelaunchable).toBe(true);
    expect(cards[0].launchPath).toBe('/grade/4/multiplication/multiplication-tables?mode=challenge&count=20&start=1&difficulty=basic');
  });

  it('marks a record from a since-changed rules version as not relaunchable', () => {
    const staleConfig: TrainingConfiguration = { ...BASE_CONFIG, rulesVersion: BASE_CONFIG.rulesVersion + 99 };
    const cards = buildTrainingRecords([makeResult({ configuration: staleConfig, correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 })]);
    expect(cards[0].isRelaunchable).toBe(false);
    expect(cards[0].launchPath).toBeNull();
  });

  it('marks a record for an unregistered activity as not relaunchable', () => {
    const unknownConfig: TrainingConfiguration = { ...BASE_CONFIG, activityId: 'no-longer-exists' };
    const cards = buildTrainingRecords([makeResult({ configuration: unknownConfig, correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800 })]);
    expect(cards[0].isRelaunchable).toBe(false);
  });

  it('sorts records newest-first by last-played date', () => {
    const results = [
      makeResult({ configuration: { ...BASE_CONFIG, questionCount: 50 }, correctCount: 50, longestStreak: 50, averageMsPerQuestion: 3000, completedAt: '2026-01-01T10:00:00.000Z' }),
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 2800, completedAt: '2026-02-01T10:00:00.000Z' }),
    ];
    const cards = buildTrainingRecords(results);
    expect(cards[0].configuration.questionCount).toBe(20);
    expect(cards[1].configuration.questionCount).toBe(50);
  });
});

describe('summarizeTrainingResults', () => {
  it('returns nulls and a zero count when nothing has been played', () => {
    expect(summarizeTrainingResults([])).toEqual({ averageAccuracy: null, averagePaceMs: null, challengeCount: 0 });
  });

  it('averages accuracy and pace across every stored challenge attempt', () => {
    const results = [
      makeResult({ correctCount: 20, longestStreak: 20, averageMsPerQuestion: 3000 }),
      makeResult({ correctCount: 18, longestStreak: 10, averageMsPerQuestion: 4000 }),
    ];
    const summary = summarizeTrainingResults(results);
    expect(summary.challengeCount).toBe(2);
    expect(summary.averageAccuracy).toBeCloseTo((1 + 0.9) / 2);
    expect(summary.averagePaceMs).toBe(3500);
  });
});
