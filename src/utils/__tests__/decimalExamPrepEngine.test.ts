import { describe, expect, it } from 'vitest';
import {
  buildDiagnosticSlots,
  buildMockExamSlots,
  buildQuestionsForSkill,
  buildQuestionsForSlots,
  classifySkillStat,
  computeSkillStats,
  MOCK_EXAM_QUESTION_COUNT,
  SKILL_I18N_PREFIX,
  SKILL_MIN_CONFIDENT_SAMPLE,
  SKILL_PATHS,
  SKILL_WEAK_ACCURACY_THRESHOLD,
} from '../decimalExamPrepEngine';
import { PLACE_VALUE_SKILL_IDS } from '../../types/placeValue';
import { seededRandom } from '../random';

const SAMPLE_COUNT = 50;

describe('buildQuestionsForSkill', () => {
  it('generates a sound question for every skill at every difficulty', () => {
    const difficulties = ['basic', 'intermediate', 'advanced'] as const;
    for (const skillId of PLACE_VALUE_SKILL_IDS) {
      for (const difficulty of difficulties) {
        const random = seededRandom(`${skillId}-${difficulty}`.length * 13 + 7);
        const questions = buildQuestionsForSkill(skillId, difficulty, 3, random);
        expect(questions).toHaveLength(3);
        for (const question of questions) {
          expect(question.skillId).toBe(skillId);
          expect(question.difficulty).toBe(difficulty);
          expect(question.validate(question.correctAnswerDisplay)).toBe(true);
        }
      }
    }
  });
});

describe('buildDiagnosticSlots', () => {
  it('always returns 12 slots covering every skill at least once', () => {
    for (let seed = 0; seed < SAMPLE_COUNT; seed += 1) {
      const slots = buildDiagnosticSlots(seededRandom(seed));
      expect(slots).toHaveLength(12);
      const bySkill = new Map<string, number>();
      for (const slot of slots) bySkill.set(slot.skillId, (bySkill.get(slot.skillId) ?? 0) + 1);
      for (const skillId of PLACE_VALUE_SKILL_IDS) expect(bySkill.get(skillId)).toBeGreaterThanOrEqual(1);
      // 8 skills once + 4 skills twice = 12 — exactly four skills get a second slot.
      const skillsWithTwo = [...bySkill.values()].filter((count) => count === 2).length;
      expect(skillsWithTwo).toBe(4);
    }
  });

  it('every slot builds into a sound, self-consistent question', () => {
    const random = seededRandom(4242);
    const slots = buildDiagnosticSlots(random);
    const questions = buildQuestionsForSlots(slots, random);
    expect(questions).toHaveLength(12);
    for (const question of questions) {
      expect(question.validate(question.correctAnswerDisplay)).toBe(true);
    }
  });
});

describe('buildMockExamSlots', () => {
  it('always returns exactly MOCK_EXAM_QUESTION_COUNT slots covering every skill at least twice', () => {
    for (let seed = 0; seed < SAMPLE_COUNT; seed += 1) {
      const slots = buildMockExamSlots(seededRandom(seed));
      expect(slots).toHaveLength(MOCK_EXAM_QUESTION_COUNT);
      const bySkill = new Map<string, number>();
      for (const slot of slots) bySkill.set(slot.skillId, (bySkill.get(slot.skillId) ?? 0) + 1);
      for (const skillId of PLACE_VALUE_SKILL_IDS) expect(bySkill.get(skillId)).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps the basic/intermediate/advanced split close to the unit-wide 20/40/40 target', () => {
    for (let seed = 0; seed < SAMPLE_COUNT; seed += 1) {
      const slots = buildMockExamSlots(seededRandom(seed));
      const counts = { basic: 0, intermediate: 0, advanced: 0 };
      for (const slot of slots) counts[slot.difficulty] += 1;
      expect(counts.basic).toBe(Math.round(MOCK_EXAM_QUESTION_COUNT * 0.2));
      expect(counts.intermediate).toBe(Math.round(MOCK_EXAM_QUESTION_COUNT * 0.4));
      expect(counts.basic + counts.intermediate + counts.advanced).toBe(MOCK_EXAM_QUESTION_COUNT);
    }
  });

  it('two calls with different random sources produce different exams', () => {
    const slotsA = buildMockExamSlots(seededRandom(1));
    const slotsB = buildMockExamSlots(seededRandom(2));
    const signatureA = slotsA.map((slot) => `${slot.skillId}:${slot.difficulty}`).join(',');
    const signatureB = slotsB.map((slot) => `${slot.skillId}:${slot.difficulty}`).join(',');
    expect(signatureA).not.toBe(signatureB);
  });

  it('every slot builds into a sound, self-consistent question, and nothing announces its own skill in the prompt key by position alone', () => {
    const random = seededRandom(99);
    const slots = buildMockExamSlots(random);
    const questions = buildQuestionsForSlots(slots, random);
    expect(questions).toHaveLength(MOCK_EXAM_QUESTION_COUNT);
    for (const question of questions) {
      expect(question.validate(question.correctAnswerDisplay)).toBe(true);
    }
  });
});

describe('computeSkillStats / classifySkillStat', () => {
  it('reports zero/zero for a skill with no answers at all', () => {
    const stats = computeSkillStats([]);
    expect(stats).toHaveLength(PLACE_VALUE_SKILL_IDS.length);
    for (const stat of stats) {
      expect(stat.total).toBe(0);
      expect(classifySkillStat(stat)).toBe('noData');
    }
  });

  it('classifies a skill below the minimum sample size as insufficientData regardless of accuracy', () => {
    for (let total = 1; total < SKILL_MIN_CONFIDENT_SAMPLE; total += 1) {
      expect(classifySkillStat({ skillId: 'placeValue', correct: 0, total })).toBe('insufficientData');
      expect(classifySkillStat({ skillId: 'placeValue', correct: total, total })).toBe('insufficientData');
    }
  });

  it('classifies a confidently-sampled skill as weak below the threshold, strong at or above it', () => {
    const total = SKILL_MIN_CONFIDENT_SAMPLE;
    const borderlineCorrect = Math.ceil(total * SKILL_WEAK_ACCURACY_THRESHOLD);
    expect(classifySkillStat({ skillId: 'ordering', correct: borderlineCorrect - 1, total })).toBe('weak');
    expect(classifySkillStat({ skillId: 'ordering', correct: total, total })).toBe('strong');
  });

  it('only counts answers for the skill they belong to', () => {
    const stats = computeSkillStats([
      { skillId: 'placeValue', correct: true },
      { skillId: 'placeValue', correct: false },
      { skillId: 'rounding', correct: true },
    ]);
    const placeValue = stats.find((s) => s.skillId === 'placeValue')!;
    const rounding = stats.find((s) => s.skillId === 'rounding')!;
    const decomposition = stats.find((s) => s.skillId === 'decomposition')!;
    expect(placeValue).toEqual({ skillId: 'placeValue', correct: 1, total: 2 });
    expect(rounding).toEqual({ skillId: 'rounding', correct: 1, total: 1 });
    expect(decomposition).toEqual({ skillId: 'decomposition', correct: 0, total: 0 });
  });
});

describe('skill lookup tables stay in sync with the skill id list', () => {
  it('SKILL_I18N_PREFIX and SKILL_PATHS cover every skill exactly once', () => {
    for (const skillId of PLACE_VALUE_SKILL_IDS) {
      expect(SKILL_I18N_PREFIX[skillId]).toBeTruthy();
      expect(SKILL_PATHS[skillId]).toMatch(/^\/grade\/4\/decimal-place-value\//);
    }
  });
});
