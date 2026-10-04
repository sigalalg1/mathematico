import { describe, expect, it } from 'vitest';
import {
  assertWordProblemChallengeIsSound,
  buildWordProblemChallenges,
  WORD_PROBLEMS_TOTAL,
} from '../algebraWordProblemsData';
import { seededRandom } from '../../../utils/random';
import { satisfiesEquation, solveLinearEquation } from '../../../utils/algebra';

const RUNS = 400;
const sessions = Array.from({ length: RUNS }, (_, index) => buildWordProblemChallenges(seededRandom(5000 + index)));
const all = sessions.flat();

describe('session shape', () => {
  it('always builds the full fixed progression, in order', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(WORD_PROBLEMS_TOTAL);
      expect(session.map((c) => c.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
    }
  });

  it('every template appears across the progression', () => {
    for (const session of sessions) {
      const templates = new Set(session.map((c) => c.templateId));
      expect(templates).toEqual(new Set(['abstractPlus', 'storyPlus', 'abstractMinus', 'storyMinus']));
    }
  });
});

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const challenge of all) expect(() => assertWordProblemChallengeIsSound(challenge)).not.toThrow();
  });

  it('the stated solution always satisfies its own equation', () => {
    for (const challenge of all) expect(satisfiesEquation(challenge.equation, challenge.solution)).toBe(true);
  });

  it('the stated solution matches solving the equation directly', () => {
    for (const challenge of all) expect(solveLinearEquation(challenge.equation)).toBe(challenge.solution);
  });

  it('options are unique, four in number, and include the answer', () => {
    for (const challenge of all) {
      expect(new Set(challenge.options).size).toBe(4);
      expect(challenge.options).toContain(challenge.answer);
    }
  });

  it('minus-template equations always use a positive solution', () => {
    for (const challenge of all.filter((c) => c.templateId === 'abstractMinus' || c.templateId === 'storyMinus')) {
      expect(challenge.solution).toBeGreaterThan(0);
    }
  });

  it('every question names two distinct people for the story', () => {
    for (const challenge of all) {
      expect(challenge.storyParams.name).not.toBe(challenge.storyParams.other);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects a solution that does not satisfy the equation', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.solution += 1;
    expect(() => assertWordProblemChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects an answer missing from its own options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.answer = '__not-an-option__';
    expect(() => assertWordProblemChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.options[1] = corrupted.options[0];
    expect(() => assertWordProblemChallengeIsSound(corrupted)).toThrow();
  });
});
