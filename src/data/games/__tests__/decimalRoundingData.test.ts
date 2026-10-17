import { describe, expect, it } from 'vitest';
import { assertRoundingQuestionIsSound, buildRoundingQuestions } from '../decimalRoundingData';
import { seededRandom } from '../../../utils/random';
import { roundTo } from '../../../utils/placeValue';
import type { PlaceValueQuestion } from '../../../types/placeValue';

const DIFFICULTIES = ['basic', 'intermediate', 'advanced'];
const SAMPLES_PER_CASE = 500;

function cloneQuestion(question: PlaceValueQuestion): PlaceValueQuestion {
  return {
    ...question,
    interaction:
      question.interaction.kind === 'multipleChoice'
        ? { ...question.interaction, options: [...question.interaction.options] }
        : { ...question.interaction },
  };
}

const byDifficulty = Object.fromEntries(
  DIFFICULTIES.map((difficultyId) => [
    difficultyId,
    buildRoundingQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertRoundingQuestionIsSound(payload)).not.toThrow();
  });

  it('estimateSum and rangeJudgment only appear at advanced difficulty', () => {
    const advancedOnly = all.filter((p) => p.promptKey.includes('estimateSum') || p.promptKey.includes('rangeJudgment'));
    expect(advancedOnly.length).toBeGreaterThan(0);
    for (const payload of advancedOnly) expect(payload.difficulty).toBe('advanced');
  });
});

describe('roundTo questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('.roundTo.'));

  it('the answer always matches the real rounding result', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const n = Number(payload.display.replace(/,/g, ''));
      const place = Number(payload.explanationParams!.place.toString().replace(/,/g, ''));
      expect(Number(payload.correctAnswerDisplay)).toBe(roundTo(n, place as 10));
    }
  });
});

describe('nearestBenchmark questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('nearestBenchmark'));

  it('offers exactly the two real benchmarks as options, one of them correct', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      if (payload.interaction.kind !== 'multipleChoice') throw new Error('expected multipleChoice');
      expect(payload.interaction.options).toHaveLength(2);
      const correctOptions = payload.interaction.options.filter((o) => payload.validate(o));
      expect(correctOptions).toHaveLength(1);
    }
  });
});

describe('estimateSum questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('estimateSum'));

  it('the answer equals the sum of each addend rounded to the stated place', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const [aText, bText] = payload.display.split(' + ').map((t) => Number(t.replace(/,/g, '')));
      const roundedA = Number(payload.explanationParams!.a.toString().replace(/,/g, ''));
      const roundedB = Number(payload.explanationParams!.b.toString().replace(/,/g, ''));
      expect(roundedA + roundedB).toBe(Number(payload.correctAnswerDisplay));
      // Sanity: the rounded values really are rounded versions of a and b (not arbitrary).
      expect(Math.abs(roundedA - aText)).toBeLessThan(10001);
      expect(Math.abs(roundedB - bText)).toBeLessThan(10001);
    }
  });
});

describe('rangeJudgment questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('rangeJudgment'));

  it('the chosen side (above/below) always matches the true exact sum', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const [aText, bText] = payload.display.split(' + ').map((t) => Number(t.replace(/,/g, '')));
      const exact = aText + bText;
      const threshold = Number(payload.explanationParams!.threshold.toString().replace(/,/g, ''));
      expect(exact).not.toBe(threshold);
      const expected = exact < threshold ? `< ${threshold.toLocaleString('en-US')}` : `> ${threshold.toLocaleString('en-US')}`;
      expect(payload.correctAnswerDisplay).toBe(expected);
    }
  });

  it('offers exactly one of the two options as correct, never both or neither', () => {
    for (const payload of questions) {
      if (payload.interaction.kind !== 'multipleChoice') throw new Error('expected multipleChoice');
      const correctCount = payload.interaction.options.filter((o) => payload.validate(o)).length;
      expect(correctCount).toBe(1);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(promptFragment: string): PlaceValueQuestion {
    const found = all.find((p) => p.promptKey.includes(promptFragment));
    if (!found) throw new Error(`no question with "${promptFragment}" in its prompt key`);
    return found;
  }

  it('rejects a correctAnswerDisplay that does not validate', () => {
    const corrupted = cloneQuestion(pick('.roundTo.'));
    corrupted.correctAnswerDisplay = '__not-a-match__';
    expect(() => assertRoundingQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate options', () => {
    const corrupted = cloneQuestion(pick('.roundTo.'));
    if (corrupted.interaction.kind === 'multipleChoice') corrupted.interaction.options[1] = corrupted.interaction.options[0];
    expect(() => assertRoundingQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects an option set with two correct answers', () => {
    const corrupted = cloneQuestion(pick('nearestBenchmark'));
    const base = corrupted.validate;
    corrupted.validate = (raw) => base(raw) || true;
    expect(() => assertRoundingQuestionIsSound(corrupted)).toThrow();
  });
});
