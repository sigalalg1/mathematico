import { describe, expect, it } from 'vitest';
import { assertDecompositionQuestionIsSound, buildDecompositionQuestions } from '../decimalDecompositionData';
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
    buildDecompositionQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)).map((q) => q.payload!),
  ]),
);
const all = Object.values(byDifficulty).flat() as PlaceValueQuestion[];

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of all) expect(() => assertDecompositionQuestionIsSound(payload)).not.toThrow();
  });

  it('every question belongs to the decomposition skill, tagged with its difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const payload of byDifficulty[difficulty]) {
        expect(payload.skillId).toBe('decomposition');
        expect(payload.difficulty).toBe(difficulty);
      }
    }
  });
});

describe('expandedSum questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('expandedSum'));

  it('the shown terms always sum to exactly the answer', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const terms = payload.display.split(' + ').map((t) => Number(t.replace(/,/g, '')));
      const sum = terms.reduce((total, term) => total + term, 0);
      expect(sum).toBe(Number(payload.correctAnswerDisplay));
    }
  });
});

describe('missingTerm questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('missingTerm'));

  it('substituting the correct answer for the blank reconstructs the original number', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) {
      const [totalText, sumText] = payload.display.split(' = ');
      const total = Number(totalText.replace(/,/g, ''));
      const terms = sumText.split(' + ').map((t) => (t === '___' ? Number(payload.correctAnswerDisplay) : Number(t.replace(/,/g, ''))));
      expect(terms.reduce((sum, t) => sum + t, 0)).toBe(total);
    }
  });

  it('never hides a term equal to 0 (there would be nothing to find)', () => {
    for (const payload of questions) {
      expect(Number(payload.correctAnswerDisplay)).toBeGreaterThan(0);
    }
  });
});

describe('nonstandardCompose questions', () => {
  const questions = all.filter((p) => p.promptKey.includes('nonstandardCompose'));

  it('the displayed multiplication-and-sum evaluates to exactly the answer', () => {
    expect(questions.length).toBeGreaterThan(0);
    const pattern = /^(\d+) × ([\d,]+) \+ (\d+) × ([\d,]+)$/;
    for (const payload of questions) {
      const match = pattern.exec(payload.display);
      expect(match).not.toBeNull();
      const [, bigCount, bigUnit, smallCount, smallUnit] = match!;
      const total = Number(bigCount) * Number(bigUnit.replace(/,/g, '')) + Number(smallCount) * Number(smallUnit.replace(/,/g, ''));
      expect(total).toBe(Number(payload.correctAnswerDisplay));
    }
  });
});

describe('recognizeDecomposition questions (advanced only)', () => {
  const questions = all.filter((p) => p.promptKey.includes('recognizeDecomposition'));

  it('only appears at advanced difficulty', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const payload of questions) expect(payload.difficulty).toBe('advanced');
  });

  it('exactly one option actually sums to the shown number', () => {
    for (const payload of questions) {
      if (payload.interaction.kind !== 'multipleChoice') throw new Error('expected multipleChoice');
      const target = Number(payload.display.replace(/,/g, ''));
      const validSums = payload.interaction.options.filter((option) => {
        const sum = option.split(' + ').reduce((total, term) => total + Number(term.replace(/,/g, '')), 0);
        return sum === target;
      });
      expect(validSums).toHaveLength(1);
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
    const corrupted = cloneQuestion(pick('expandedSum'));
    corrupted.correctAnswerDisplay = '__not-a-match__';
    expect(() => assertDecompositionQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate multiple-choice options', () => {
    const corrupted = cloneQuestion(pick('recognizeDecomposition'));
    if (corrupted.interaction.kind === 'multipleChoice') corrupted.interaction.options[1] = corrupted.interaction.options[0];
    expect(() => assertDecompositionQuestionIsSound(corrupted)).toThrow();
  });
});
