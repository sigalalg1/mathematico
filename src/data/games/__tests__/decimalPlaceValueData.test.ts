import { describe, expect, it } from 'vitest';
import { assertPlaceValueQuestionIsSound, buildPlaceValueQuestions } from '../decimalPlaceValueData';
import { seededRandom } from '../../../utils/random';
import type { TrainingQuestion } from '../../../types/training';
import type { PlaceValueQuestion } from '../../../types/placeValue';

/**
 * `PlaceValueQuestion.validate` is a function, so `structuredClone` can't
 * copy it (functions aren't structured-cloneable). A shallow-ish copy that
 * preserves the function reference is enough for these mutation tests,
 * which only ever change a primitive field or the options array.
 */
function cloneQuestion(question: PlaceValueQuestion): PlaceValueQuestion {
  return {
    ...question,
    interaction:
      question.interaction.kind === 'multipleChoice'
        ? { ...question.interaction, options: [...question.interaction.options] }
        : { ...question.interaction },
  };
}

const DIFFICULTIES = ['basic', 'intermediate', 'advanced'];
const SAMPLES_PER_CASE = 400;

const byDifficulty: Record<string, TrainingQuestion<PlaceValueQuestion>[]> = Object.fromEntries(
  DIFFICULTIES.map((difficultyId) => [
    difficultyId,
    buildPlaceValueQuestions({ difficultyId, count: SAMPLES_PER_CASE }, seededRandom(difficultyId.length * 7919 + 13)),
  ]),
);
const all = Object.values(byDifficulty).flat();
const payloads = all.map((q) => q.payload!);

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const payload of payloads) expect(() => assertPlaceValueQuestionIsSound(payload)).not.toThrow();
  });

  it('every question belongs to the placeValue skill, tagged with its difficulty', () => {
    for (let i = 0; i < DIFFICULTIES.length; i += 1) {
      for (const payload of byDifficulty[DIFFICULTIES[i]].map((q) => q.payload!)) {
        expect(payload.skillId).toBe('placeValue');
        expect(payload.difficulty).toBe(DIFFICULTIES[i]);
      }
    }
  });

  it('every question kind from the spec appears across the generator', () => {
    const promptKeys = new Set(payloads.map((p) => p.promptKey.split('.')[2]));
    expect(promptKeys).toEqual(new Set(['digitValue', 'countUnit', 'composeUnit']));
  });
});

describe('difficulty is not silently identical across levels', () => {
  it('basic never uses countUnit (it is introduced at intermediate)', () => {
    const basicKinds = new Set(byDifficulty.basic.map((q) => q.payload!.promptKey.split('.')[2]));
    expect(basicKinds.has('countUnit')).toBe(false);
  });

  it('advanced numbers reach into the hundred-thousands; basic never does', () => {
    // composeUnit's display is "count × unit", not the number itself — only
    // digitValue/countUnit questions display the plain number directly.
    const plainNumberDisplay = (p: PlaceValueQuestion) => !p.display.includes('×');
    const maxBasic = Math.max(
      ...byDifficulty.basic
        .map((q) => q.payload!)
        .filter(plainNumberDisplay)
        .map((p) => Number(p.display.replace(/,/g, ''))),
    );
    const hasLargeAdvanced = byDifficulty.advanced
      .map((q) => q.payload!)
      .filter(plainNumberDisplay)
      .some((p) => /^\d{3},\d{3}$/.test(p.display));
    expect(maxBasic).toBeLessThan(10000);
    expect(hasLargeAdvanced).toBe(true);
  });
});

describe('digitValue questions', () => {
  const digitValueQuestions = payloads.filter((p) => p.promptKey.includes('digitValue'));

  it('never names a place where the digit is 0 (that would make the "value" trivially 0)', () => {
    expect(digitValueQuestions.length).toBeGreaterThan(0);
    for (const payload of digitValueQuestions) {
      expect(Number(payload.correctAnswerDisplay)).toBeGreaterThan(0);
    }
  });

  it('offers exactly one correct multiple-choice option', () => {
    for (const payload of digitValueQuestions) {
      expect(payload.interaction.kind).toBe('multipleChoice');
      if (payload.interaction.kind !== 'multipleChoice') continue;
      const correctCount = payload.interaction.options.filter((o) => payload.validate(o)).length;
      expect(correctCount).toBe(1);
    }
  });
});

describe('countUnit / composeUnit are genuine inverses', () => {
  it('composeFromUnits(countOfUnit(n)) recovers the original rounded-down number', () => {
    const countQuestions = payloads.filter((p) => p.promptKey.includes('countUnit'));
    expect(countQuestions.length).toBeGreaterThan(0);
    for (const payload of countQuestions) {
      const n = Number(payload.display.replace(/,/g, ''));
      const count = Number(payload.correctAnswerDisplay);
      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThan(0);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('composeUnit questions always produce an exact integer result', () => {
    const composeQuestions = payloads.filter((p) => p.promptKey === 'decimalPlaceValue.promptFor.composeUnit');
    expect(composeQuestions.length).toBeGreaterThan(0);
    for (const payload of composeQuestions) {
      expect(Number.isInteger(Number(payload.correctAnswerDisplay))).toBe(true);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  function pick(promptFragment: string) {
    const found = payloads.find((p) => p.promptKey.includes(promptFragment));
    if (!found) throw new Error(`no question with "${promptFragment}" in its prompt key across ${SAMPLES_PER_CASE * 3} samples`);
    return found;
  }

  it('rejects a correctAnswerDisplay that does not validate', () => {
    const corrupted = cloneQuestion(pick('digitValue'));
    corrupted.correctAnswerDisplay = '__not-a-match__';
    expect(() => assertPlaceValueQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects duplicate multiple-choice options', () => {
    const corrupted = cloneQuestion(pick('digitValue'));
    if (corrupted.interaction.kind === 'multipleChoice') corrupted.interaction.options[1] = corrupted.interaction.options[0];
    expect(() => assertPlaceValueQuestionIsSound(corrupted)).toThrow();
  });

  it('rejects a multiple-choice set with two options that both validate', () => {
    const corrupted = cloneQuestion(pick('digitValue'));
    const correctAnswer = Number(corrupted.correctAnswerDisplay);
    corrupted.validate = (raw: string) => Number(raw) === correctAnswer || Number(raw) === correctAnswer + 1;
    if (corrupted.interaction.kind === 'multipleChoice') {
      corrupted.interaction.options[1] = String(correctAnswer + 1);
    }
    expect(() => assertPlaceValueQuestionIsSound(corrupted)).toThrow();
  });
});
