import { describe, expect, it } from 'vitest';
import {
  assertLikeTermsQuestionIsSound,
  buildLikeTermsQuestions,
  classifyLikeTermsMistake,
} from '../algebraLikeTermsData';
import { seededRandom } from '../../../utils/random';
import { formatLinearExpr, simplifyTerms } from '../../../utils/algebra';

const DIFFICULTIES = ['basic', 'intermediate', 'hard'];
const SAMPLES_PER_CASE = 400;

const byDifficulty = Object.fromEntries(
  DIFFICULTIES.map((difficultyId) => [
    difficultyId,
    buildLikeTermsQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)),
  ]),
);
const all = Object.values(byDifficulty).flat();

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const question of all) expect(() => assertLikeTermsQuestionIsSound(question)).not.toThrow();
  });

  it('the answer always equals simplifying the shown terms', () => {
    for (const question of all) {
      expect(question.answer).toBe(formatLinearExpr(simplifyTerms(question.payload!.terms)));
    }
  });

  it('every question has at least two x-terms — otherwise there is nothing to combine', () => {
    for (const question of all) {
      expect(question.payload!.terms.filter((term) => term.isVariable).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('basic questions use only positive coefficients and no constants', () => {
    for (const question of byDifficulty.basic) {
      expect(question.payload!.terms.every((term) => term.isVariable)).toBe(true);
      expect(question.payload!.terms.every((term) => term.coefficient > 0)).toBe(true);
    }
  });

  it('intermediate questions mix variables and constants', () => {
    for (const question of byDifficulty.intermediate) {
      const terms = question.payload!.terms;
      expect(terms.some((term) => term.isVariable)).toBe(true);
      expect(terms.some((term) => !term.isVariable)).toBe(true);
    }
  });

  it('hard questions can include a negative coefficient', () => {
    const hasNegative = byDifficulty.hard.some((question) => question.payload!.terms.some((term) => term.coefficient < 0));
    expect(hasNegative).toBe(true);
  });

  it('never offers the "combine everything" misconception as the correct answer', () => {
    for (const question of all) {
      const terms = question.payload!.terms;
      const combinedEverything = formatLinearExpr({ coefficient: terms.reduce((sum, t) => sum + t.coefficient, 0), constant: 0 });
      if (terms.some((t) => !t.isVariable)) {
        expect(question.answer).not.toBe(combinedEverything);
      }
    }
  });
});

describe('classifyLikeTermsMistake', () => {
  it('names the "combined unlike terms" misconception', () => {
    const terms = [
      { coefficient: 3, isVariable: true },
      { coefficient: 4, isVariable: false },
    ];
    expect(classifyLikeTermsMistake(terms, '7x')).toBe('combinedUnlikeTerms');
  });

  it('names a dropped sign', () => {
    const terms = [
      { coefficient: 4, isVariable: true },
      { coefficient: -2, isVariable: true },
    ];
    // The correct simplification is 2x; flipping the sign of the -2x term gives 6x.
    expect(classifyLikeTermsMistake(terms, '6x')).toBe('droppedASign');
  });

  it('falls back to "other" for an unrelated guess', () => {
    const terms = [
      { coefficient: 3, isVariable: true },
      { coefficient: 2, isVariable: true },
    ];
    expect(classifyLikeTermsMistake(terms, '__nonsense__')).toBe('other');
  });

  it('never throws for any option offered on any generated question', () => {
    for (const question of all) {
      for (const option of question.options) {
        expect(() => classifyLikeTermsMistake(question.payload!.terms, option)).not.toThrow();
        expect(['combinedUnlikeTerms', 'droppedASign', 'other']).toContain(classifyLikeTermsMistake(question.payload!.terms, option));
      }
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects an answer that does not match simplifying the terms', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.answer = '__not-an-option__';
    expect(() => assertLikeTermsQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate options', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.options[1] = corrupted.options[0];
    expect(() => assertLikeTermsQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a question with fewer than two x-terms', () => {
    const corrupted = structuredClone(all[0]);
    corrupted.payload!.terms = corrupted.payload!.terms.map((term) => ({ ...term, isVariable: false }));
    expect(() => assertLikeTermsQuestionIsSound(corrupted)).toThrow();
  });
});
