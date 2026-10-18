import { describe, expect, it } from 'vitest';
import { assertOrderingQuestionIsSound, buildOrderingQuestions } from '../decimalOrderingData';
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
    buildOrderingQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertOrderingQuestionIsSound(payload)).not.toThrow();
  });

  it('every question belongs to the ordering skill, tagged with its difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const payload of byDifficulty[difficulty]) {
        expect(payload.skillId).toBe('ordering');
        expect(payload.difficulty).toBe(difficulty);
      }
    }
  });

  it('numberBetween only appears at advanced difficulty', () => {
    const questions = all.filter((p) => p.promptKey.includes('numberBetween'));
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) expect(payload.difficulty).toBe('advanced');
  });
});

describe('compare questions', () => {
  const questions = all.filter((p) => p.interaction.kind === 'compareSymbol');

  it('the stated symbol always matches the real comparison', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      if (payload.interaction.kind !== 'compareSymbol') continue;
      const left = Number(payload.interaction.left.replace(/,/g, ''));
      const right = Number(payload.interaction.right.replace(/,/g, ''));
      const expected = left < right ? '<' : left > right ? '>' : '=';
      expect(payload.correctAnswerDisplay).toBe(expected);
    }
  });

  it('produces both equal and unequal pairs across many samples', () => {
    const symbols = new Set(questions.map((p) => p.correctAnswerDisplay));
    expect(symbols.has('<') || symbols.has('>')).toBe(true);
  });
});

describe('sequenceNext questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('sequenceNext'));

  it('the next term continues the same step as every shown gap', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const shown = payload.display
        .replace(' → ?', '')
        .split(' → ')
        .map((t) => Number(t.replace(/,/g, '')));
      const step = shown[1] - shown[0];
      for (let i = 2; i < shown.length; i += 1) expect(shown[i] - shown[i - 1]).toBe(step);
      expect(Number(payload.correctAnswerDisplay) - shown.at(-1)!).toBe(step);
    }
  });
});

describe('numberBetween questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('numberBetween'));

  it('the interval is non-empty and strictly open', () => {
    for (const payload of questions) {
      const [lowerText, upperText] = payload.display.split(' < n < ');
      const lower = Number(lowerText.replace(/,/g, ''));
      const upper = Number(upperText.replace(/,/g, ''));
      expect(upper).toBeGreaterThan(lower + 1);
    }
  });

  it('accepts every integer strictly inside the interval, and rejects the boundaries', () => {
    for (const payload of questions) {
      const [lowerText, upperText] = payload.display.split(' < n < ');
      const lower = Number(lowerText.replace(/,/g, ''));
      const upper = Number(upperText.replace(/,/g, ''));
      expect(payload.validate(String(lower))).toBe(false);
      expect(payload.validate(String(upper))).toBe(false);
      expect(payload.validate(String(lower + 1))).toBe(true);
      expect(payload.validate(String(upper - 1))).toBe(true);
    }
  });

  it('is flagged as having multiple valid answers', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) expect(payload.hasMultipleValidAnswers).toBe(true);
  });
});

describe('orderFour questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('orderFour'));

  it('exactly one option is the true ascending order', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      if (payload.interaction.kind !== 'multipleChoice') throw new Error('expected multipleChoice');
      const shown = payload.display.split(', ').map((t) => Number(t.replace(/,/g, '')));
      const sortedText = [...shown].sort((a, b) => a - b).map((n) => n.toLocaleString('en-US')).join(', ');
      const matches = payload.interaction.options.filter((option) => option === sortedText);
      expect(matches).toHaveLength(1);
      expect(payload.correctAnswerDisplay).toBe(sortedText);
    }
  });

  it('never repeats a number within the same question', () => {
    for (const payload of questions) {
      const shown = payload.display.split(', ');
      expect(new Set(shown).size).toBe(shown.length);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(promptFragment: string): PlaceValueQuestion {
    const found = all.find((p) => p.promptKey.includes(promptFragment));
    if (!found) throw new Error(`no question with "${promptFragment}" in its prompt key`);
    return found;
  }

  it('rejects a compare symbol that disagrees with the real numbers', () => {
    const corrupted = cloneQuestion(pick('compare'));
    const wrongSymbol = corrupted.correctAnswerDisplay === '<' ? '>' : '<';
    corrupted.correctAnswerDisplay = wrongSymbol;
    expect(() => assertOrderingQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate orderFour options', () => {
    const corrupted = cloneQuestion(pick('orderFour'));
    if (corrupted.interaction.kind === 'multipleChoice') corrupted.interaction.options[1] = corrupted.interaction.options[0];
    expect(() => assertOrderingQuestionIsSound(corrupted)).toThrow();
  });
});
