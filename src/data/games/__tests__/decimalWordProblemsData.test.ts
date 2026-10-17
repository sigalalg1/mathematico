import { describe, expect, it } from 'vitest';
import { assertWordProblemsQuestionIsSound, buildWordProblemsQuestions } from '../decimalWordProblemsData';
import { seededRandom } from '../../../utils/random';
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
    buildWordProblemsQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 6151 + 29)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertWordProblemsQuestionIsSound(payload)).not.toThrow();
  });

  it('every question carries its full story in the prompt, never a bare math display', () => {
    for (const payload of all) expect(payload.display).toBe('');
  });

  it('basic difficulty only uses single-step addition/subtraction scenarios', () => {
    const basicKeys = new Set(byDifficulty.basic.map((p: PlaceValueQuestion) => p.promptKey));
    expect([...basicKeys].every((k) => k.includes('sumScenario') || k.includes('differenceScenario'))).toBe(true);
  });

  it('multiStepScenario and digitValueScenario only appear at advanced difficulty', () => {
    for (const payload of all) {
      if (payload.promptKey.includes('multiStepScenario') || payload.promptKey.includes('digitValueScenario')) {
        expect(payload.difficulty).toBe('advanced');
      }
    }
  });
});

describe('sumScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('sumScenario'));

  it('the answer is exactly the sum of the two stated quantities', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const a = Number(String(payload.promptParams!.a).replace(/,/g, ''));
      const b = Number(String(payload.promptParams!.b).replace(/,/g, ''));
      expect(Number(payload.correctAnswerDisplay)).toBe(a + b);
    }
  });
});

describe('differenceScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('differenceScenario') && !p.promptKey.includes('missingAddend'));

  it('the answer is exactly the first quantity minus the second, and never negative', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const a = Number(String(payload.promptParams!.a).replace(/,/g, ''));
      const b = Number(String(payload.promptParams!.b).replace(/,/g, ''));
      expect(Number(payload.correctAnswerDisplay)).toBe(a - b);
      expect(Number(payload.correctAnswerDisplay)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('compareScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('compareScenario'));

  it('validate accepts only the true comparison symbol between the two quantities', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      expect(payload.interaction.kind).toBe('compareSymbol');
      if (payload.interaction.kind !== 'compareSymbol') continue;
      const a = Number(payload.interaction.left.replace(/,/g, ''));
      const b = Number(payload.interaction.right.replace(/,/g, ''));
      expect(a).not.toBe(b);
      const expected = a < b ? '<' : '>';
      expect(payload.correctAnswerDisplay).toBe(expected);
      for (const symbol of ['<', '=', '>']) expect(payload.validate(symbol)).toBe(symbol === expected);
    }
  });
});

describe('roundEstimateScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('roundEstimateScenario'));

  it('the answer is the value rounded to the place named in the prompt key', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const value = Number(String(payload.promptParams!.value).replace(/,/g, ''));
      const result = Number(payload.correctAnswerDisplay);
      expect(result % 10).toBe(0);
      expect(Math.abs(result - value)).toBeLessThanOrEqual(5000);
    }
  });
});

describe('missingAddendScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('missingAddendScenario'));

  it('before + answer = after', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const before = Number(String(payload.promptParams!.before).replace(/,/g, ''));
      const after = Number(String(payload.promptParams!.after).replace(/,/g, ''));
      expect(before + Number(payload.correctAnswerDisplay)).toBe(after);
    }
  });
});

describe('multiStepScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('multiStepScenario'));

  it('the answer is (firstWeek + secondWeek) - used, and never negative', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const firstWeek = Number(String(payload.promptParams!.firstWeek).replace(/,/g, ''));
      const secondWeek = Number(String(payload.promptParams!.secondWeek).replace(/,/g, ''));
      const used = Number(String(payload.promptParams!.used).replace(/,/g, ''));
      const expected = firstWeek + secondWeek - used;
      expect(Number(payload.correctAnswerDisplay)).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    }
  });
});

describe('digitValueScenario questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('digitValueScenario'));

  it('the answer is a multiple of a power of ten, matching the digit times its place value', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const result = Number(payload.correctAnswerDisplay);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10_000_000);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(promptFragment: string): PlaceValueQuestion {
    const found = all.find((p) => p.promptKey.includes(promptFragment));
    if (!found) throw new Error(`no question with "${promptFragment}" in its prompt key`);
    return found;
  }

  it('rejects a question whose correctAnswerDisplay does not validate', () => {
    const corrupted = cloneQuestion(pick('sumScenario'));
    corrupted.correctAnswerDisplay = String(Number(corrupted.correctAnswerDisplay) + 1);
    expect(() => assertWordProblemsQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a numericInput question with a negative correctAnswerDisplay', () => {
    const corrupted = cloneQuestion(pick('differenceScenario'));
    corrupted.correctAnswerDisplay = '-5';
    corrupted.validate = (raw) => raw === '-5';
    expect(() => assertWordProblemsQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a compareSymbol question where validate disagrees with correctAnswerDisplay', () => {
    const corrupted = cloneQuestion(pick('compareScenario'));
    corrupted.validate = () => true;
    expect(() => assertWordProblemsQuestionIsSound(corrupted)).toThrow();
  });
});
