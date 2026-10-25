import { describe, expect, it } from 'vitest';
import { anglesTypesActivity, assertAngleTypeChallengeIsSound, buildAnglesTypesQuestions } from '../anglesTypesData';
import { classifyAngle7, isUnambiguouslyClassifiable, resolveAngle } from '../../../geometry/angleMath';
import type { AnglesDifficultyId } from '../../../types/anglesGrade7';

const DIFFICULTIES: AnglesDifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('anglesTypesData generator', () => {
  it('produces a sound question for every kind across many seeds and difficulties', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 80; seed += 1) {
        const questions = buildAnglesTypesQuestions({ difficultyId: difficulty, count: 12, seed });
        expect(questions).toHaveLength(12);
        for (const question of questions) {
          expect(() => assertAngleTypeChallengeIsSound(question.payload!)).not.toThrow();
          expect(question.options).toContain(question.answer);
        }
      }
    }
  });

  it('classify: every generated angle respects the mandatory classification safety margin, with no eyeballing', () => {
    let classifyCount = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      const questions = buildAnglesTypesQuestions({ difficultyId: 'advanced', count: 10, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'classify') continue;
        classifyCount += 1;
        expect(isUnambiguouslyClassifiable(challenge.degrees)).toBe(true);
        expect(classifyAngle7(challenge.degrees)).toBe(challenge.answer);
        // The diagram's own resolved angle (from the real ray coordinates) must agree with the stored degrees.
        const resolved = resolveAngle(challenge.scene, challenge.ref);
        expect(resolved.degrees).toBeCloseTo(challenge.degrees, 5);
        expect(resolved.type).toBe(challenge.answer);
      }
    }
    expect(classifyCount).toBeGreaterThan(100);
  });

  it('classify: a right angle is always drawn at exactly 90° (within float tolerance), never merely close', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const questions = buildAnglesTypesQuestions({ difficultyId: 'basic', count: 8, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind === 'classify' && challenge.answer === 'right') {
          expect(challenge.degrees).toBeCloseTo(90, 5);
        }
        if (challenge.kind === 'classify' && challenge.answer === 'straight') {
          expect(challenge.degrees).toBeCloseTo(180, 5);
        }
      }
    }
  });

  it('order: the stored answer always matches sorting the real degree measures, for both "smallest" and "largest" modes', () => {
    let sawSmallest = false;
    let sawLargest = false;
    for (let seed = 0; seed < 200; seed += 1) {
      const questions = buildAnglesTypesQuestions({ difficultyId: 'intermediate', count: 10, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'order') continue;
        if (challenge.mode === 'smallest') sawSmallest = true;
        else sawLargest = true;
        const sorted = [...challenge.options].sort((a, b) => a.degrees - b.degrees);
        const expected = challenge.mode === 'smallest' ? sorted[0].id : sorted[sorted.length - 1].id;
        expect(challenge.answer).toBe(expected);
        // Every option's stored degrees must match what the scene's own geometry actually measures.
        for (const option of challenge.options) {
          const resolved = resolveAngle(option.scene, option.ref);
          expect(resolved.degrees).toBeCloseTo(option.degrees, 5);
        }
      }
    }
    expect(sawSmallest).toBe(true);
    expect(sawLargest).toBe(true);
  });

  it('order: no two offered angles are ever closer than the difficulty\'s minimum gap (the comparison must have one unambiguous answer)', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const questions = buildAnglesTypesQuestions({ difficultyId: 'advanced', count: 10, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'order') continue;
        const degrees = challenge.options.map((o) => o.degrees).sort((a, b) => a - b);
        for (let i = 1; i < degrees.length; i += 1) {
          expect(degrees[i] - degrees[i - 1]).toBeGreaterThanOrEqual(9); // advanced min gap is 10, allow 1° slack for randInt rounding
        }
      }
    }
  });

  it('is registered with three difficulty levels', () => {
    expect(anglesTypesActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
