import { describe, expect, it } from 'vitest';
import { assertConstraintsQuestionIsSound, buildConstraintsQuestions } from '../decimalConstraintsData';
import { seededRandom } from '../../../utils/random';
import { digitAt } from '../../../utils/placeValue';
import type { PlaceValueQuestion } from '../../../types/placeValue';

const DIFFICULTIES = ['basic', 'intermediate', 'advanced'];
const SAMPLES_PER_CASE = 400;

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
    buildConstraintsQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertConstraintsQuestionIsSound(payload)).not.toThrow();
  });

  it('every question has a concrete, validating example answer', () => {
    for (const payload of all) {
      expect(payload.correctAnswerDisplay).not.toBe('');
      expect(payload.validate(payload.correctAnswerDisplay)).toBe(true);
    }
  });

  it('rangeAndDigit and targetSum only appear from intermediate up', () => {
    const basicKinds = new Set(byDifficulty.basic.map((p: PlaceValueQuestion) => p.promptKey));
    expect([...basicKinds].every((k) => k.includes('missingDigit'))).toBe(true);
  });
});

describe('missingDigit questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('missingDigit'));

  it('the masked digit, substituted back in, reproduces a true addition', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const match = /^([\d,_]+) \+ ([\d,]+) = ([\d,]+)$/.exec(payload.display);
      expect(match).not.toBeNull();
      const [, maskedText, otherText, totalText] = match!;
      const restored = Number(maskedText.replace(/,/g, '').replace('_', payload.correctAnswerDisplay));
      const other = Number(otherText.replace(/,/g, ''));
      const total = Number(totalText.replace(/,/g, ''));
      expect(restored + other).toBe(total);
    }
  });

  it('the hidden digit is always a single digit (0-9)', () => {
    for (const payload of questions) {
      const n = Number(payload.correctAnswerDisplay);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(9);
    }
  });

  it('exactly one underscore appears in the masked number', () => {
    for (const payload of questions) {
      const masked = payload.display.split(' + ')[0];
      expect((masked.match(/_/g) ?? []).length).toBe(1);
    }
  });
});

describe('rangeAndDigit questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('rangeAndDigit'));

  it('only appears at intermediate and advanced difficulty', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) expect(payload.difficulty).not.toBe('basic');
  });

  it('is flagged as having multiple valid answers, and the interval is strictly open', () => {
    for (const payload of questions) {
      expect(payload.hasMultipleValidAnswers).toBe(true);
      const [lowerText, upperText] = payload.display.split(' < n < ');
      const lower = Number(lowerText.replace(/,/g, ''));
      const upper = Number(upperText.replace(/,/g, ''));
      expect(payload.validate(String(lower))).toBe(false);
      expect(payload.validate(String(upper))).toBe(false);
    }
  });

  it('validate requires both the range AND the hundreds-digit condition', () => {
    for (const payload of questions) {
      const [lowerText, upperText] = payload.display.split(' < n < ');
      const lower = Number(lowerText.replace(/,/g, ''));
      const upper = Number(upperText.replace(/,/g, ''));
      const requiredDigit = Number(payload.promptParams!.digit);
      // A number inside the range but with the wrong hundreds digit must fail.
      for (let n = lower + 1; n < upper; n += 1) {
        const expected = digitAt(n, 100) === requiredDigit;
        expect(payload.validate(String(n))).toBe(expected);
      }
    }
  });
});

describe('targetSum questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('targetSum'));

  it('only appears at advanced difficulty', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) expect(payload.difficulty).toBe('advanced');
  });

  it('at least one pair in the palette sums to exactly the stated target', () => {
    for (const payload of questions) {
      if (payload.interaction.kind !== 'constructChoice') continue;
      const target = Number(payload.promptParams!.target.toString().replace(/,/g, ''));
      const { numbers } = payload.interaction;
      const solvable = numbers.some((a) => numbers.some((b) => a !== b && a + b === target));
      expect(solvable).toBe(true);
    }
  });

  it('validate rejects a sum that does not hit the target exactly', () => {
    for (const payload of questions) {
      if (payload.interaction.kind !== 'constructChoice') continue;
      const { numbers } = payload.interaction;
      expect(payload.validate(`${numbers[0]}+1`)).toBe(false);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(promptFragment: string): PlaceValueQuestion {
    const found = all.find((p) => p.promptKey.includes(promptFragment));
    if (!found) throw new Error(`no question with "${promptFragment}" in its prompt key`);
    return found;
  }

  it('rejects a missing example answer', () => {
    const corrupted = cloneQuestion(pick('rangeAndDigit'));
    corrupted.correctAnswerDisplay = '';
    expect(() => assertConstraintsQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a rangeAndDigit question where a boundary itself validates', () => {
    const corrupted = cloneQuestion(pick('rangeAndDigit'));
    const base = corrupted.validate;
    corrupted.validate = (raw) => base(raw) || raw === corrupted.display.split(' < n < ')[0].replace(/,/g, '');
    expect(() => assertConstraintsQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a constructChoice question with no solvable pair', () => {
    const corrupted = cloneQuestion(pick('targetSum'));
    corrupted.validate = () => false;
    expect(() => assertConstraintsQuestionIsSound(corrupted)).toThrow();
  });
});
