import { describe, expect, it } from 'vitest';
import {
  anglesNotationActivity,
  assertAngleNotationChallengeIsSound,
  buildAnglesNotationQuestions,
} from '../anglesNotationData';
import { isValidAngleName, namesReferToSameAngle } from '../../../geometry/angleNotation';
import { interiorAngleArmLabels } from '../../../geometry/polygon';
import type { AnglesDifficultyId } from '../../../types/anglesGrade7';

const DIFFICULTIES: AnglesDifficultyId[] = ['basic', 'intermediate', 'advanced'];

describe('anglesNotationData generator', () => {
  it('produces a well-posed question (exactly one correct name) for every kind across many seeds and difficulties', () => {
    let sawSelectName = 0;
    let sawSelectInvalid = 0;
    let sawTriangle = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 150; seed += 1) {
        const questions = buildAnglesNotationQuestions({ difficultyId: difficulty, count: 8, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          expect(() => assertAngleNotationChallengeIsSound(challenge)).not.toThrow();
          expect(question.options).toContain(question.answer);
          if (challenge.kind === 'selectName') sawSelectName += 1;
          if (challenge.kind === 'selectInvalid') sawSelectInvalid += 1;
          if (challenge.kind === 'triangleInterior') sawTriangle += 1;
        }
      }
    }
    expect(sawSelectName).toBeGreaterThan(50);
    expect(sawSelectInvalid).toBeGreaterThan(20);
    expect(sawTriangle).toBeGreaterThan(20);
  });

  it('selectName: accepts the letter-order-agnostic convention — the correct answer is always a genuinely valid name, and no distractor is also valid', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const questions = buildAnglesNotationQuestions({ difficultyId: 'intermediate', count: 6, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'selectName') continue;
        const ref = challenge.highlightedRef!;
        const vertexLabel = challenge.scene!.vertex.label;
        const rayA = challenge.scene!.rays.find((r) => r.id === ref.rayAId)!;
        const rayB = challenge.scene!.rays.find((r) => r.id === ref.rayBId)!;
        expect(isValidAngleName(challenge.answer, vertexLabel, [rayA.label, rayB.label])).toBe(true);
        for (const option of challenge.options) {
          if (option === challenge.answer) continue;
          expect(namesReferToSameAngle(option, challenge.answer)).toBe(false);
        }
      }
    }
  });

  it('selectInvalid: the designated answer is genuinely invalid, and both other options are genuinely valid', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const questions = buildAnglesNotationQuestions({ difficultyId: 'basic', count: 10, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'selectInvalid') continue;
        const ref = challenge.highlightedRef!;
        const vertexLabel = challenge.scene!.vertex.label;
        const rayA = challenge.scene!.rays.find((r) => r.id === ref.rayAId)!;
        const rayB = challenge.scene!.rays.find((r) => r.id === ref.rayBId)!;
        const armLabels: [string, string] = [rayA.label, rayB.label];
        expect(isValidAngleName(challenge.answer, vertexLabel, armLabels)).toBe(false);
        for (const option of challenge.options) {
          if (option === challenge.answer) continue;
          expect(isValidAngleName(option, vertexLabel, armLabels)).toBe(true);
        }
      }
    }
  });

  it('triangleInterior (Skill-E enrichment): the correct name always matches the actual two other triangle vertices', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const questions = buildAnglesNotationQuestions({ difficultyId: 'advanced', count: 10, seed });
      for (const question of questions) {
        const challenge = question.payload!;
        if (challenge.kind !== 'triangleInterior') continue;
        const vertexLabel = challenge.triangle!.vertices[challenge.highlightedVertexIndex!].label;
        const armLabels = interiorAngleArmLabels(challenge.triangle!, challenge.highlightedVertexIndex!);
        expect(isValidAngleName(challenge.answer, vertexLabel, armLabels)).toBe(true);
      }
    }
  });

  it('is registered with three difficulty levels', () => {
    expect(anglesNotationActivity.capabilities.difficulties.map((d) => d.id)).toEqual(['basic', 'intermediate', 'advanced']);
  });
});
