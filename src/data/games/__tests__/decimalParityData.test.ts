import { describe, expect, it } from 'vitest';
import { assertParityQuestionIsSound, buildParityQuestions } from '../decimalParityData';
import { seededRandom } from '../../../utils/random';
import { isEven } from '../../../utils/placeValue';
import { parseConstructAnswer } from '../../../utils/placeValueQuestion';
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
    buildParityQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertParityQuestionIsSound(payload)).not.toThrow();
  });

  it('construct* templates only appear at advanced difficulty', () => {
    const constructs = all.filter((p) => p.interaction.kind === 'constructChoice');
    expect(constructs.length).toBeGreaterThan(0);
    for (const payload of constructs) expect(payload.difficulty).toBe('advanced');
  });
});

describe('parity questions', () => {
  const questions = all.filter((p) => p.interaction.kind === 'evenOddChoice');

  it('the stated parity always matches the real arithmetic result', () => {
    expect(questions.length).toBeGreaterThan(0);
    const pattern = /^([\d,]+) ([+−]) ([\d,]+)$/;
    for (const payload of questions) {
      const match = pattern.exec(payload.display);
      expect(match).not.toBeNull();
      const [, aText, op, bText] = match!;
      const a = Number(aText.replace(/,/g, ''));
      const b = Number(bText.replace(/,/g, ''));
      const result = op === '+' ? a + b : a - b;
      expect(payload.correctAnswerDisplay).toBe(isEven(result) ? 'even' : 'odd');
    }
  });

  it('exactly one of even/odd validates', () => {
    for (const payload of questions) {
      expect(payload.validate('even')).toBe(payload.correctAnswerDisplay === 'even');
      expect(payload.validate('odd')).toBe(payload.correctAnswerDisplay === 'odd');
    }
  });

  it('produces both even and odd results across many samples', () => {
    const parities = new Set(questions.map((p) => p.correctAnswerDisplay));
    expect(parities).toEqual(new Set(['even', 'odd']));
  });
});

describe('compareExpressions questions', () => {
  const questions = all.filter((p) => p.interaction.kind === 'compareSymbol');

  it('the stated symbol always matches evaluating both expressions', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      if (payload.interaction.kind !== 'compareSymbol') continue;
      const evalExpr = (text: string) => {
        const [a, b] = text.split(' + ').map((t) => Number(t.replace(/,/g, '')));
        return a + b;
      };
      const left = evalExpr(payload.interaction.left);
      const right = evalExpr(payload.interaction.right);
      const expected = left < right ? '<' : left > right ? '>' : '=';
      expect(payload.correctAnswerDisplay).toBe(expected);
    }
  });

  it('never claims the two expressions are equal (by construction, for this template)', () => {
    for (const payload of questions) expect(payload.correctAnswerDisplay).not.toBe('=');
  });
});

describe('constructEven questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('constructEven'));

  it('the palette has at least two even and two odd numbers, so either parity is reachable', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      if (payload.interaction.kind !== 'constructChoice') continue;
      const evens = payload.interaction.numbers.filter(isEven);
      const odds = payload.interaction.numbers.filter((n) => !isEven(n));
      expect(evens.length).toBeGreaterThanOrEqual(2);
      expect(odds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('validate only ever accepts combinations that are both in the palette and actually even', () => {
    for (const payload of questions) {
      if (payload.interaction.kind !== 'constructChoice') continue;
      const { numbers } = payload.interaction;
      for (const a of numbers) {
        for (const b of numbers) {
          if (a === b) continue;
          const sum = `${a}+${b}`;
          expect(payload.validate(sum)).toBe(isEven(a + b));
        }
      }
      // A combination using a number NOT on the palette is never accepted,
      // even if it would otherwise satisfy the condition.
      expect(payload.validate(`${numbers[0]}+999999998`)).toBe(false);
    }
  });
});

describe('constructThreshold questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('constructThreshold'));

  it('at least one real combination from the palette satisfies the threshold', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      if (payload.interaction.kind !== 'constructChoice') continue;
      const { numbers, operations } = payload.interaction;
      const solvable = numbers.some((a) => numbers.some((b) => a !== b && operations.some((op) => payload.validate(`${a}${op}${b}`))));
      expect(solvable).toBe(true);
    }
  });

  it('never accepts a negative result', () => {
    for (const payload of questions) {
      if (payload.interaction.kind !== 'constructChoice') continue;
      const { numbers } = payload.interaction;
      for (const a of numbers) {
        for (const b of numbers) {
          if (a >= b) continue;
          // a - b would be negative here; the scene never offers this pairing
          // in that order, but validate() must still reject it defensively.
          const parsed = parseConstructAnswer(`${a}-${b}`);
          if (parsed && parsed.result < 0) expect(payload.validate(`${a}-${b}`)).toBe(false);
        }
      }
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(predicate: (p: PlaceValueQuestion) => boolean): PlaceValueQuestion {
    const found = all.find(predicate);
    if (!found) throw new Error('no matching question found across samples');
    return found;
  }

  it('rejects an evenOddChoice question where both even and odd validate', () => {
    const corrupted = cloneQuestion(pick((p) => p.interaction.kind === 'evenOddChoice'));
    corrupted.validate = () => true;
    expect(() => assertParityQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a compareSymbol question whose validate disagrees with correctAnswerDisplay', () => {
    const corrupted = cloneQuestion(pick((p) => p.interaction.kind === 'compareSymbol'));
    corrupted.validate = () => false;
    expect(() => assertParityQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a constructChoice question with no solvable combination', () => {
    const corrupted = cloneQuestion(pick((p) => p.interaction.kind === 'constructChoice'));
    corrupted.validate = () => false;
    expect(() => assertParityQuestionIsSound(corrupted)).toThrow();
  });
});
