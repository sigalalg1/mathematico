import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTrainingSession } from '../useTrainingSession';
import type { TrainingClock } from '../clock';
import type { TrainingActivityDefinition, TrainingConfiguration } from '../../types/training';

/**
 * A hand-cranked clock: every duration in these tests is exact, so nothing
 * depends on real wall-clock delays.
 */
function fakeClock(): TrainingClock & { advance: (ms: number) => void } {
  let current = 0;
  let ids = 0;
  return {
    now: () => current,
    timestamp: () => new Date(1_700_000_000_000 + current).toISOString(),
    newId: () => `session-${(ids += 1)}`,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

const activity: TrainingActivityDefinition = {
  id: 'testActivity',
  i18nPrefix: 'testActivity',
  capabilities: {
    questionCounts: [3],
    defaultQuestionCount: 3,
    difficulties: [],
    defaultDifficultyId: null,
    supportsChallenge: true,
    challengeQuestionCounts: [3],
    paceRecordMinAccuracy: 1,
    rulesVersion: 1,
  },
  generateQuestions: ({ count }) =>
    Array.from({ length: count }, (_, index) => ({
      id: `q${index}`,
      prompt: `${index} + 1`,
      answer: String(index + 1),
      options: [String(index + 1), 'wrong'],
    })),
};

const configuration: TrainingConfiguration = {
  activityId: 'testActivity',
  difficultyId: null,
  questionCount: 3,
  rulesVersion: 1,
};

function setup(clock: TrainingClock) {
  return renderHook(() => useTrainingSession({ activity, configuration, mode: 'challenge', clock }));
}

describe('useTrainingSession', () => {
  it('runs a flawless session and reports full accuracy', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    for (let i = 0; i < 3; i += 1) {
      act(() => result.current.submit(String(i + 1)));
      act(() => result.current.advance());
    }

    expect(result.current.phase).toBe('completed');
    expect(result.current.result?.correctCount).toBe(3);
    expect(result.current.result?.accuracy).toBe(1);
    expect(result.current.result?.longestStreak).toBe(3);
  });

  it('continues past a mistake instead of ending or repeating the question', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    act(() => result.current.submit('wrong'));
    expect(result.current.phase).toBe('feedback');
    act(() => result.current.advance());

    // The session moved on to the next question rather than retrying in place.
    expect(result.current.index).toBe(1);
    expect(result.current.phase).toBe('answering');
    expect(result.current.question.id).toBe('q1');
  });

  it('resets the current streak on a wrong answer and keeps the longest one', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    act(() => result.current.submit('1'));
    act(() => result.current.advance());
    expect(result.current.currentStreak).toBe(1);

    act(() => result.current.submit('wrong'));
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(1);

    act(() => result.current.advance());
    act(() => result.current.submit('3'));
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.longestStreak).toBe(1);
  });

  it('measures only the time a question was interactive, not the feedback pause', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    // Question 1: two seconds of thinking, then a long feedback pause.
    clock.advance(2000);
    act(() => result.current.submit('1'));
    clock.advance(5000);
    act(() => result.current.advance());

    // Question 2: one second of thinking.
    clock.advance(1000);
    act(() => result.current.submit('2'));
    clock.advance(5000);
    act(() => result.current.advance());

    // Question 3: three seconds.
    clock.advance(3000);
    act(() => result.current.submit('3'));
    act(() => result.current.advance());

    const finished = result.current.result!;
    expect(result.current.answers.map((answer) => answer.elapsedMs)).toEqual([2000, 1000, 3000]);
    expect(finished.answeringDurationMs).toBe(6000);
    expect(finished.averageMsPerQuestion).toBe(2000);
    // The wall clock did include the pauses, and is kept as context only.
    expect(finished.totalDurationMs).toBe(16_000);
  });

  it('ignores a second answer for the same question, so timing cannot be gamed', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    clock.advance(4000);
    act(() => result.current.submit('wrong'));
    clock.advance(10);
    act(() => result.current.submit('1'));

    expect(result.current.answers).toHaveLength(1);
    expect(result.current.answers[0].isCorrect).toBe(false);
    expect(result.current.answers[0].elapsedMs).toBe(4000);
  });

  it('ignores an advance that is not acknowledging feedback', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    act(() => result.current.advance());
    expect(result.current.index).toBe(0);
    expect(result.current.phase).toBe('answering');
  });

  it('restarts the identical configuration from a clean slate', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    for (let i = 0; i < 3; i += 1) {
      clock.advance(1000);
      act(() => result.current.submit('wrong'));
      act(() => result.current.advance());
    }
    const firstRoundKey = result.current.roundKey;

    act(() => result.current.restart());

    expect(result.current.result).toBeNull();
    expect(result.current.answers).toEqual([]);
    expect(result.current.index).toBe(0);
    expect(result.current.phase).toBe('answering');
    expect(result.current.roundKey).toBe(firstRoundKey + 1);

    clock.advance(500);
    act(() => result.current.submit('1'));
    expect(result.current.answers[0].elapsedMs).toBe(500);
  });
});
