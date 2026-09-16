import { afterEach, describe, expect, it } from 'vitest';
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

/** Backgrounding the tab, the way the browser reports it. */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function setup(clock: TrainingClock) {
  return renderHook(() => useTrainingSession({ activity, configuration, mode: 'challenge', clock }));
}

describe('useTrainingSession', () => {
  // The document is shared between tests; never leave it backgrounded.
  afterEach(() => setVisibility('visible'));

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

  it('reports the running active duration while the session is being played', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    expect(result.current.getActiveDurationMs()).toBe(0);
    clock.advance(2500);
    expect(result.current.getActiveDurationMs()).toBe(2500);

    act(() => result.current.submit('1'));
    clock.advance(1000);
    // The session clock keeps running through the feedback beat.
    expect(result.current.getActiveDurationMs()).toBe(3500);
  });

  it('excludes time the tab was hidden from the think time and the session total', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    clock.advance(1000);
    act(() => setVisibility('hidden'));
    // The child locked their phone for ten seconds mid-question.
    clock.advance(10_000);
    act(() => setVisibility('visible'));
    clock.advance(1000);
    act(() => result.current.submit('1'));

    expect(result.current.answers[0].elapsedMs).toBe(2000);
    expect(result.current.getActiveDurationMs()).toBe(2000);

    act(() => result.current.advance());
    clock.advance(1000);
    act(() => result.current.submit('2'));
    act(() => result.current.advance());
    clock.advance(1000);
    act(() => result.current.submit('3'));
    act(() => result.current.advance());

    const finished = result.current.result!;
    expect(finished.answeringDurationMs).toBe(4000);
    expect(finished.totalDurationMs).toBe(4000);
    // Without the fix the ten hidden seconds would have made this look slower.
    expect(finished.averageMsPerQuestion).toBeCloseTo(4000 / 3);
  });

  it('does not lose the session when the tab is hidden — only the time', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    act(() => result.current.submit('1'));
    act(() => result.current.advance());
    act(() => setVisibility('hidden'));
    clock.advance(30_000);
    act(() => setVisibility('visible'));

    expect(result.current.index).toBe(1);
    expect(result.current.phase).toBe('answering');
    expect(result.current.answers).toHaveLength(1);
  });

  it('excludes explicitly paused time and resumes correctly', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    clock.advance(1000);
    act(() => result.current.pause());
    expect(result.current.isPaused).toBe(true);
    clock.advance(20_000);
    expect(result.current.getActiveDurationMs()).toBe(1000);

    act(() => result.current.resume());
    expect(result.current.isPaused).toBe(false);
    clock.advance(500);
    act(() => result.current.submit('1'));

    expect(result.current.answers[0].elapsedMs).toBe(1500);
  });

  it('keeps the clock stopped when a hidden tab becomes visible again mid-pause', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    act(() => result.current.pause());
    act(() => setVisibility('hidden'));
    clock.advance(5000);
    act(() => setVisibility('visible'));
    clock.advance(5000);

    expect(result.current.getActiveDurationMs()).toBe(0);

    act(() => result.current.resume());
    clock.advance(1000);
    expect(result.current.getActiveDurationMs()).toBe(1000);
  });

  it('totals a whole session of mixed active, hidden and paused spans', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    // Question 1: 2s of thinking around a 15s absence.
    clock.advance(1000);
    act(() => setVisibility('hidden'));
    clock.advance(15_000);
    act(() => setVisibility('visible'));
    clock.advance(1000);
    act(() => result.current.submit('1'));
    clock.advance(500); // feedback beat
    act(() => result.current.advance());

    // Question 2: 3s of thinking around a 9s pause.
    clock.advance(2000);
    act(() => result.current.pause());
    clock.advance(9000);
    act(() => result.current.resume());
    clock.advance(1000);
    act(() => result.current.submit('2'));
    clock.advance(500);
    act(() => result.current.advance());

    // Question 3: a straightforward 4s.
    clock.advance(4000);
    act(() => result.current.submit('3'));
    act(() => result.current.advance());

    const finished = result.current.result!;
    expect(result.current.answers.map((answer) => answer.elapsedMs)).toEqual([2000, 3000, 4000]);
    expect(finished.answeringDurationMs).toBe(9000);
    expect(finished.averageMsPerQuestion).toBe(3000);
    // Think time plus the two feedback beats — and none of the 24 absent seconds.
    expect(finished.totalDurationMs).toBe(10_000);
  });

  it('restarts the active clock from zero for a replay', () => {
    const clock = fakeClock();
    const { result } = setup(clock);

    clock.advance(5000);
    act(() => result.current.restart());
    expect(result.current.getActiveDurationMs()).toBe(0);

    act(() => setVisibility('hidden'));
    clock.advance(8000);
    act(() => setVisibility('visible'));
    clock.advance(1000);
    act(() => result.current.submit('1'));

    expect(result.current.answers[0].elapsedMs).toBe(1000);
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
