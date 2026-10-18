import { describe, expect, it } from 'vitest';
import {
  assertEquationMeaningChallengeIsSound,
  buildEquationMeaningChallenges,
  EQUATION_MEANING_TOTAL,
} from '../algebraEquationMeaningData';
import { seededRandom } from '../../../utils/random';
import { satisfiesEquation, solveLinearEquation } from '../../../utils/algebra';

const RUNS = 400;
const sessions = Array.from({ length: RUNS }, (_, index) => buildEquationMeaningChallenges(seededRandom(3000 + index)));
const all = sessions.flat();

describe('session shape', () => {
  it('always builds the full fixed progression, in order', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(EQUATION_MEANING_TOTAL);
      expect(session.map((c) => c.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
    }
  });

  it('both question kinds appear across the progression', () => {
    for (const session of sessions) {
      const kinds = new Set(session.map((c) => c.kind));
      expect(kinds).toEqual(new Set(['pickSolution', 'isSolution']));
    }
  });
});

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const challenge of all) expect(() => assertEquationMeaningChallengeIsSound(challenge)).not.toThrow();
  });

  it('every equation has a well-defined unique solution', () => {
    for (const challenge of all) expect(solveLinearEquation(challenge.equation)).not.toBeNull();
  });

  it('pickSolution questions offer exactly one option that actually solves the equation', () => {
    for (const challenge of all.filter((c) => c.kind === 'pickSolution')) {
      const solvers = challenge.options.filter((option) => satisfiesEquation(challenge.equation, Number(option)));
      expect(solvers).toEqual([challenge.answer]);
    }
  });

  it('isSolution questions sometimes answer yes and sometimes no, across many sessions', () => {
    const isSolutionQuestions = all.filter((c) => c.kind === 'isSolution');
    expect(isSolutionQuestions.some((c) => c.answer === 'yes')).toBe(true);
    expect(isSolutionQuestions.some((c) => c.answer === 'no')).toBe(true);
  });

  it('q7 tests signed numbers: the solution is always negative', () => {
    for (const session of sessions) {
      const q7 = session.find((c) => c.id === 'q7')!;
      expect(solveLinearEquation(q7.equation)).toBeLessThan(0);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects a pickSolution answer that does not solve its own equation', () => {
    const corrupted = structuredClone(all.find((c) => c.kind === 'pickSolution')!);
    const wrong = corrupted.options.find((option) => option !== corrupted.answer)!;
    corrupted.answer = wrong;
    expect(() => assertEquationMeaningChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects an isSolution yes/no answer that disagrees with substitution', () => {
    const corrupted = structuredClone(all.find((c) => c.kind === 'isSolution')!);
    corrupted.answer = corrupted.answer === 'yes' ? 'no' : 'yes';
    expect(() => assertEquationMeaningChallengeIsSound(corrupted)).toThrow();
  });
});
