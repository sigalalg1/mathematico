import { describe, expect, it } from 'vitest';
import {
  accuracyPercent,
  computeSessionResult,
  formatDuration,
  longestStreakOf,
  secondsPerQuestion,
} from '../metrics';
import type { TrainingAnswerRecord, TrainingConfiguration } from '../../types/training';

const configuration: TrainingConfiguration = {
  activityId: 'multiplicationTables',
  difficultyId: 'basic',
  questionCount: 4,
  rulesVersion: 1,
};

function answer(isCorrect: boolean, elapsedMs: number, index: number): TrainingAnswerRecord {
  return {
    questionId: `q${index}`,
    prompt: '2 × 3',
    answer: isCorrect ? '6' : '5',
    correctAnswer: '6',
    isCorrect,
    elapsedMs,
  };
}

function result(answers: TrainingAnswerRecord[]) {
  return computeSessionResult({
    id: 'session-1',
    configuration,
    mode: 'challenge',
    startedAt: '2026-01-01T10:00:00.000Z',
    completedAt: '2026-01-01T10:01:00.000Z',
    totalDurationMs: 60_000,
    answers,
  });
}

describe('training metrics', () => {
  it('scores a flawless session as full accuracy with a streak the length of the session', () => {
    const computed = result([answer(true, 1000, 0), answer(true, 2000, 1), answer(true, 3000, 2)]);

    expect(computed.correctCount).toBe(3);
    expect(computed.incorrectCount).toBe(0);
    expect(computed.accuracy).toBe(1);
    expect(computed.longestStreak).toBe(3);
  });

  it('counts mistakes without ending or shortening the session', () => {
    const computed = result([answer(true, 1000, 0), answer(false, 1000, 1), answer(true, 1000, 2), answer(true, 1000, 3)]);

    expect(computed.totalQuestions).toBe(4);
    expect(computed.correctCount).toBe(3);
    expect(computed.incorrectCount).toBe(1);
    expect(computed.accuracy).toBe(0.75);
  });

  it('resets the streak on a wrong answer and reports the longest run', () => {
    expect(longestStreakOf([{ isCorrect: true }, { isCorrect: true }, { isCorrect: false }, { isCorrect: true }])).toBe(2);
    expect(longestStreakOf([{ isCorrect: false }, { isCorrect: true }, { isCorrect: true }, { isCorrect: true }])).toBe(3);
    expect(longestStreakOf([{ isCorrect: false }, { isCorrect: false }])).toBe(0);
    expect(longestStreakOf([])).toBe(0);
  });

  it('averages only the measured answering time, not the wall-clock duration', () => {
    const computed = result([answer(true, 2000, 0), answer(true, 4000, 1), answer(false, 3000, 2)]);

    expect(computed.answeringDurationMs).toBe(9000);
    // The wall clock also covered feedback pauses; pace ignores them.
    expect(computed.totalDurationMs).toBe(60_000);
    expect(computed.averageMsPerQuestion).toBe(3000);
  });

  it('keeps millisecond precision in storage and rounds only for display', () => {
    const computed = result([answer(true, 3140, 0), answer(true, 3160, 1)]);

    expect(computed.averageMsPerQuestion).toBe(3150);
    expect(secondsPerQuestion(computed.averageMsPerQuestion)).toBe(3.2);
    expect(accuracyPercent(2 / 3)).toBe(67);
  });

  it('never divides by zero for an empty session', () => {
    const computed = result([]);
    expect(computed.accuracy).toBe(0);
    expect(computed.averageMsPerQuestion).toBe(0);
    // Nothing was answered, so there is no pace to show — not `Infinity`, `NaN`
    // or a nonsense figure on the results screen.
    expect(secondsPerQuestion(computed.averageMsPerQuestion)).toBe(0);
  });

  it('shows a pace at one decimal, never at raw precision', () => {
    expect(secondsPerQuestion(3184.729)).toBe(3.2);
    expect(secondsPerQuestion(2950)).toBe(3);
    expect(secondsPerQuestion(0)).toBe(0);
    expect(secondsPerQuestion(Number.NaN)).toBe(0);
    expect(secondsPerQuestion(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('formats a duration as minutes and padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(34_000)).toBe('0:34');
    expect(formatDuration(34_900)).toBe('0:34');
    expect(formatDuration(64_000)).toBe('1:04');
    expect(formatDuration(68_500)).toBe('1:08');
    expect(formatDuration(3_600_000)).toBe('60:00');
    // Defensive: a negative or missing duration is shown as zero, not as `-1:59`.
    expect(formatDuration(-5000)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});
