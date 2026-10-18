import { describe, expect, it } from 'vitest';
import {
  applyOperationToEquation,
  assertSolveChallengeIsSound,
  assertStepOptionsAreSound,
  buildSolveChallenges,
  SOLVING_TOTAL,
  stepOptionsFor,
  type LinearOperation,
} from '../algebraSolvingData';
import { seededRandom } from '../../../utils/random';
import { satisfiesEquation, solveLinearEquation } from '../../../utils/algebra';

const RUNS = 300;
const sessions = Array.from({ length: RUNS }, (_, index) => buildSolveChallenges(seededRandom(4000 + index)));
const all = sessions.flat();

describe('session shape', () => {
  it('always builds the full fixed progression, in order', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(SOLVING_TOTAL);
      expect(session.map((c) => c.level)).toEqual(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D']);
    }
  });
});

describe('generator invariants', () => {
  it('every generated challenge passes its own soundness check', () => {
    for (const challenge of all) expect(() => assertSolveChallengeIsSound(challenge)).not.toThrow();
  });

  it('the stated solution always satisfies the original equation', () => {
    for (const challenge of all) expect(satisfiesEquation(challenge.equation, challenge.solution)).toBe(true);
  });

  it('the stated solution matches solving the equation directly', () => {
    for (const challenge of all) expect(solveLinearEquation(challenge.equation)).toBe(challenge.solution);
  });

  it('replaying the canonical path from the original equation lands on x = solution', () => {
    for (const challenge of all) {
      let state = challenge.equation;
      for (const operation of challenge.canonicalPath) state = applyOperationToEquation(state, operation);
      expect(state.left).toEqual({ coefficient: 1, constant: 0 });
      expect(state.right).toEqual({ coefficient: 0, constant: challenge.solution });
    }
  });

  it('level A questions solve in exactly one step', () => {
    for (const challenge of all.filter((c) => c.level === 'A')) expect(challenge.canonicalPath).toHaveLength(1);
  });

  it('level B questions solve in exactly two steps', () => {
    for (const challenge of all.filter((c) => c.level === 'B')) expect(challenge.canonicalPath).toHaveLength(2);
  });

  it('level C questions use signed numbers and solve in one or two steps', () => {
    for (const challenge of all.filter((c) => c.level === 'C')) {
      expect(challenge.canonicalPath.length).toBeGreaterThanOrEqual(1);
      expect(challenge.canonicalPath.length).toBeLessThanOrEqual(2);
      expect(challenge.solution).toBeLessThan(0);
    }
  });

  it('level D questions have x on both sides of the original equation', () => {
    for (const challenge of all.filter((c) => c.level === 'D')) {
      expect(challenge.equation.right.coefficient).not.toBe(0);
    }
  });

  it('only level D has x on both sides', () => {
    for (const challenge of all.filter((c) => c.level !== 'D')) {
      expect(challenge.equation.right.coefficient).toBe(0);
    }
  });

  it('no step ever divides by zero', () => {
    for (const challenge of all) {
      for (const operation of challenge.canonicalPath) {
        if (operation.kind === 'divide') expect(operation.divisor).not.toBe(0);
      }
    }
  });
});

describe('step options', () => {
  const optionSamples = all.flatMap((challenge, index) =>
    challenge.canonicalPath.map((_, stepIndex) => ({
      challenge,
      stepIndex,
      options: stepOptionsFor(challenge, stepIndex, seededRandom(index * 97 + stepIndex)),
    })),
  );

  it('every step options set passes its own soundness check', () => {
    for (const { challenge, stepIndex, options } of optionSamples) {
      expect(() => assertStepOptionsAreSound(options, challenge.canonicalPath[stepIndex])).not.toThrow();
    }
  });

  it('the correct operation is always among the offered options', () => {
    for (const { challenge, stepIndex, options } of optionSamples) {
      const correct = challenge.canonicalPath[stepIndex];
      const signature = (op: LinearOperation) => JSON.stringify(op);
      expect(options.map(signature)).toContain(signature(correct));
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects a solution that does not satisfy the equation', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.solution += 1;
    expect(() => assertSolveChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects a canonical path that does not finish at x = solution', () => {
    const corrupted = structuredClone(all.find((c) => c.canonicalPath.length > 0)!);
    corrupted.canonicalPath = corrupted.canonicalPath.slice(0, -1);
    expect(() => assertSolveChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects a level D challenge with no x on the right side', () => {
    const corrupted = structuredClone(all.find((c) => c.level === 'D')!);
    corrupted.equation.right.coefficient = 0;
    expect(() => assertSolveChallengeIsSound(corrupted)).toThrow();
  });
});

describe('assertStepOptionsAreSound rejects bad option sets', () => {
  const correct: LinearOperation = { kind: 'linear', coefficientDelta: 0, constantDelta: -3 };

  it('rejects a set missing the correct operation', () => {
    const options: LinearOperation[] = [
      { kind: 'linear', coefficientDelta: 0, constantDelta: 3 },
      { kind: 'divide', divisor: 2 },
      { kind: 'divide', divisor: -2 },
    ];
    expect(() => assertStepOptionsAreSound(options, correct)).toThrow();
  });

  it('rejects duplicate options', () => {
    const options: LinearOperation[] = [correct, correct, { kind: 'divide', divisor: 2 }];
    expect(() => assertStepOptionsAreSound(options, correct)).toThrow();
  });

  it('rejects a divide-by-zero option', () => {
    const options: LinearOperation[] = [correct, { kind: 'divide', divisor: 0 }, { kind: 'divide', divisor: 2 }];
    expect(() => assertStepOptionsAreSound(options, correct)).toThrow();
  });

  it('rejects a divide-by-1 option — it would be a meaningless no-op distractor', () => {
    const options: LinearOperation[] = [correct, { kind: 'divide', divisor: 1 }, { kind: 'divide', divisor: 2 }];
    expect(() => assertStepOptionsAreSound(options, correct)).toThrow();
  });

  it('rejects a no-op option', () => {
    const options: LinearOperation[] = [correct, { kind: 'linear', coefficientDelta: 0, constantDelta: 0 }, { kind: 'divide', divisor: 2 }];
    expect(() => assertStepOptionsAreSound(options, correct)).toThrow();
  });
});
