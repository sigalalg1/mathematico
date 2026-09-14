import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useChallengeRound } from '../useChallengeRound';

interface Q {
  id: string;
  answer: number;
}

const POOL: Q[] = [
  { id: 'q1', answer: 1 },
  { id: 'q2', answer: 2 },
  { id: 'q3', answer: 3 },
];

function setup(ordered = true) {
  return renderHook(() =>
    useChallengeRound<Q, number>({
      pool: POOL,
      count: POOL.length,
      ordered,
      getId: (q) => q.id,
      checkAnswer: (q, a) => q.answer === a,
      formatAnswer: String,
      formatCorrectAnswer: (q) => String(q.answer),
    }),
  );
}

describe('useChallengeRound', () => {
  it('starts unanswered on the first challenge', () => {
    const { result } = setup();
    expect(result.current.index).toBe(0);
    expect(result.current.total).toBe(3);
    expect(result.current.status).toBe('unanswered');
    expect(result.current.completed).toBe(false);
  });

  it('keeps the given order when ordered is set', () => {
    const { result } = setup(true);
    expect(result.current.challenge.id).toBe('q1');
  });

  it('locks only on a correct answer', () => {
    const { result } = setup();
    act(() => result.current.submit(1));
    expect(result.current.status).toBe('correct');
    // Further submissions are ignored once correct.
    act(() => result.current.submit(99));
    expect(result.current.status).toBe('correct');
  });

  it('allows retry in place after a wrong answer instead of advancing', () => {
    const { result } = setup();
    act(() => result.current.submit(99));
    expect(result.current.status).toBe('incorrect');
    expect(result.current.index).toBe(0);
    expect(result.current.challenge.id).toBe('q1');

    // The same challenge can be answered again — this is the "stuck after a
    // wrong answer" regression guard.
    act(() => result.current.submit(1));
    expect(result.current.status).toBe('correct');
    expect(result.current.index).toBe(0);
  });

  it('only counts a challenge as first-attempt-correct when it was never missed', () => {
    const { result } = setup();
    act(() => result.current.submit(1));
    expect(result.current.firstAttemptCorrectCount).toBe(1);

    act(() => result.current.next());
    act(() => result.current.submit(99));
    act(() => result.current.submit(2));
    expect(result.current.firstAttemptCorrectCount).toBe(1);
  });

  it('records one mistake per wrong attempt with the right answer attached', () => {
    const { result } = setup();
    act(() => result.current.submit(99));
    act(() => result.current.submit(98));
    expect(result.current.mistakes).toEqual([
      { questionId: 'q1', selectedAnswer: '99', correctAnswer: '1' },
      { questionId: 'q1', selectedAnswer: '98', correctAnswer: '1' },
    ]);
  });

  it('will not advance from an unanswered challenge', () => {
    const { result } = setup();
    act(() => result.current.next());
    expect(result.current.index).toBe(0);
  });

  it('advances through the round and completes after the last challenge', () => {
    const { result } = setup();
    for (let i = 1; i <= 3; i++) {
      act(() => result.current.submit(i));
      act(() => result.current.next());
    }
    expect(result.current.completed).toBe(true);
    expect(result.current.firstAttemptCorrectCount).toBe(3);
  });

  it('resets everything on retry, including the mistake log and score', () => {
    const { result } = setup();
    act(() => result.current.submit(99));
    act(() => result.current.submit(1));
    act(() => result.current.next());
    const keyBefore = result.current.roundKey;

    act(() => result.current.retry());
    expect(result.current.index).toBe(0);
    expect(result.current.status).toBe('unanswered');
    expect(result.current.mistakes).toEqual([]);
    expect(result.current.firstAttemptCorrectCount).toBe(0);
    expect(result.current.completed).toBe(false);
    expect(result.current.roundKey).toBe(keyBefore + 1);
  });

  it('clears the wrong-attempt flag when moving to the next challenge', () => {
    const { result } = setup();
    act(() => result.current.submit(99));
    expect(result.current.hasWrongAttempt).toBe(true);
    act(() => result.current.submit(1));
    act(() => result.current.next());
    expect(result.current.hasWrongAttempt).toBe(false);
    act(() => result.current.submit(2));
    expect(result.current.firstAttemptCorrectCount).toBe(1);
  });
});
