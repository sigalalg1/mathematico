import { describe, expect, it } from 'vitest';
import {
  assertArithmeticQuestionIsSound,
  buildArithmeticQuestions,
  decimalArithmeticActivity,
  requiresBorrowing,
  requiresCarrying,
} from '../decimalArithmeticData';
import { seededRandom } from '../../../utils/random';
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
    buildArithmeticQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertArithmeticQuestionIsSound(payload)).not.toThrow();
  });

  it('every answer matches exact integer arithmetic on the shown expression', () => {
    for (const payload of all) {
      if (payload.display.includes('___')) continue; // missing-addend handled separately below
      const match = /^([\d,]+) ([+−]) ([\d,]+)$/.exec(payload.display);
      expect(match).not.toBeNull();
      const [, aText, op, bText] = match!;
      const a = Number(aText.replace(/,/g, ''));
      const b = Number(bText.replace(/,/g, ''));
      const expected = op === '+' ? a + b : a - b;
      expect(Number(payload.correctAnswerDisplay)).toBe(expected);
    }
  });

  it('never produces a negative result', () => {
    for (const payload of all) expect(Number(payload.correctAnswerDisplay)).toBeGreaterThanOrEqual(0);
  });
});

describe('capabilities support fluency practice', () => {
  it('supports challenge mode with 20 and 50 as eligible lengths', () => {
    expect(decimalArithmeticActivity.capabilities.supportsChallenge).toBe(true);
    expect(decimalArithmeticActivity.capabilities.challengeQuestionCounts).toEqual([20, 50]);
    expect(decimalArithmeticActivity.capabilities.questionCounts).toContain(50);
  });
});

describe('multi-digit questions genuinely require regrouping', () => {
  it('intermediate/advanced additions always require carrying', () => {
    // Exclude missingAddend questions — their display also contains " + "
    // (e.g. "___ + 3,450 = 8,000") but is a different expression shape.
    const additions = [...byDifficulty.intermediate, ...byDifficulty.advanced].filter(
      (p) => p.display.includes(' + ') && !p.display.includes('___'),
    );
    expect(additions.length).toBeGreaterThan(0);
    for (const payload of additions) {
      const [aText, bText] = payload.display.split(' + ').map((t) => Number(t.replace(/,/g, '')));
      expect(requiresCarrying(aText, bText)).toBe(true);
    }
  });

  it('intermediate/advanced subtractions (excluding the dedicated zero-crossing kind) always require borrowing', () => {
    const subtractions = [...byDifficulty.intermediate, ...byDifficulty.advanced].filter(
      (p) => p.display.includes(' − ') && !p.id.startsWith('arith-zero-'),
    );
    expect(subtractions.length).toBeGreaterThan(0);
    for (const payload of subtractions) {
      const [aText, bText] = payload.display.split(' − ').map((t) => Number(t.replace(/,/g, '')));
      expect(requiresBorrowing(aText, bText)).toBe(true);
    }
  });
});

describe('zero-crossing subtraction (advanced)', () => {
  const questions = all.filter((p) => p.id.startsWith('arith-zero-'));

  it('only appears at advanced difficulty and always requires borrowing', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      expect(payload.difficulty).toBe('advanced');
      const [aText, bText] = payload.display.split(' − ').map((t) => Number(t.replace(/,/g, '')));
      expect(requiresBorrowing(aText, bText)).toBe(true);
    }
  });
});

describe('missingAddend questions', () => {
  const questions = all.filter((p) => p.display.includes('___'));

  it('the missing addend plus the known addend equals the total', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const match = /^___ \+ ([\d,]+) = ([\d,]+)$/.exec(payload.display);
      expect(match).not.toBeNull();
      const [, knownText, totalText] = match!;
      const known = Number(knownText.replace(/,/g, ''));
      const total = Number(totalText.replace(/,/g, ''));
      expect(Number(payload.correctAnswerDisplay) + known).toBe(total);
    }
  });

  it('only appears at advanced difficulty', () => {
    for (const payload of questions) expect(payload.difficulty).toBe('advanced');
  });
});

describe('requiresBorrowing / requiresCarrying', () => {
  it('a subtraction with no digit shortfall never requires borrowing', () => {
    expect(requiresBorrowing(9876, 1234)).toBe(false);
  });

  it('a subtraction with any digit shortfall requires borrowing', () => {
    expect(requiresBorrowing(9000, 8999)).toBe(true);
    expect(requiresBorrowing(6796, 1608)).toBe(true);
  });

  it('an addition with no digit-pair reaching 10 never requires carrying', () => {
    expect(requiresCarrying(1000, 2000)).toBe(false);
  });

  it('an addition with any digit-pair reaching 10+ requires carrying', () => {
    expect(requiresCarrying(38000, 5040)).toBe(true); // thousands: 8 + 5 = 13
    expect(requiresCarrying(4600, 3800)).toBe(true); // hundreds: 6 + 8 = 14
    expect(requiresCarrying(1000, 2000)).toBe(false); // every digit pair sums below 10
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects a correctAnswerDisplay that does not validate', () => {
    const corrupted = cloneQuestion(all[0]);
    corrupted.correctAnswerDisplay = '__not-a-match__';
    expect(() => assertArithmeticQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a negative result', () => {
    const corrupted = cloneQuestion(all[0]);
    corrupted.correctAnswerDisplay = '-5';
    corrupted.validate = (raw) => raw === '-5';
    expect(() => assertArithmeticQuestionIsSound(corrupted)).toThrow();
  });
});
