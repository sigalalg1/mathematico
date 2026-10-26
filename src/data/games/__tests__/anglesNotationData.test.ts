import { describe, expect, it } from 'vitest';
import {
  anglesNotationActivity,
  assertAngleNotationChallengeIsSound,
  buildAnglesNotationQuestions,
} from '../anglesNotationData';
import { canUseVertexOnlyName, isValidAngleName, namesReferToSameAngle } from '../../../geometry/angleNotation';
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

  describe('selectAllNames', () => {
    it('every option is genuinely valid or genuinely invalid, matching isValidAngleName/canUseVertexOnlyName exactly', () => {
      let sawSelectAllNames = 0;
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 0; seed < 150; seed += 1) {
          const questions = buildAnglesNotationQuestions({ difficultyId: difficulty, count: 8, seed });
          for (const question of questions) {
            const challenge = question.payload!;
            if (challenge.kind !== 'selectAllNames') continue;
            sawSelectAllNames += 1;
            const ref = challenge.highlightedRef!;
            const vertexLabel = challenge.scene!.vertex.label;
            const rayA = challenge.scene!.rays.find((r) => r.id === ref.rayAId)!;
            const rayB = challenge.scene!.rays.find((r) => r.id === ref.rayBId)!;
            const armLabels: [string, string] = [rayA.label, rayB.label];
            const rayCountAtVertex = challenge.scene!.rays.length;

            for (const option of challenge.nameOptions!) {
              const isVertexOnly = option.name === vertexLabel;
              const expectedValid = isVertexOnly ? canUseVertexOnlyName(rayCountAtVertex) : isValidAngleName(option.name, vertexLabel, armLabels);
              expect(option.valid).toBe(expectedValid);
            }
          }
        }
      }
      expect(sawSelectAllNames).toBeGreaterThan(50);
    });

    it('the number of correct names actually varies across a generated sample — never silently collapsing to always 2', () => {
      const correctCounts = new Set<number>();
      for (let seed = 0; seed < 300; seed += 1) {
        const questions = buildAnglesNotationQuestions({ difficultyId: 'basic', count: 8, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          if (challenge.kind !== 'selectAllNames') continue;
          correctCounts.add(challenge.nameOptions!.filter((o) => o.valid).length);
        }
      }
      expect(correctCounts.has(2)).toBe(true);
      expect(correctCounts.has(3)).toBe(true);
      expect(correctCounts.size).toBe(2);
    });

    it('a vertex-only name is only ever offered when canUseVertexOnlyName says it is unambiguous (exactly 2 rays at the vertex)', () => {
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 0; seed < 150; seed += 1) {
          const questions = buildAnglesNotationQuestions({ difficultyId: difficulty, count: 8, seed });
          for (const question of questions) {
            const challenge = question.payload!;
            if (challenge.kind !== 'selectAllNames') continue;
            const vertexLabel = challenge.scene!.vertex.label;
            const vertexOnlyOption = challenge.nameOptions!.find((o) => o.name === vertexLabel);
            if (vertexOnlyOption) {
              expect(vertexOnlyOption.valid).toBe(true);
              expect(canUseVertexOnlyName(challenge.scene!.rays.length)).toBe(true);
              expect(challenge.scene!.rays.length).toBe(2);
            }
          }
        }
      }
    });

    it('the canonical answer string always equals the sorted, comma-joined ids of exactly the valid options', () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const questions = buildAnglesNotationQuestions({ difficultyId: 'intermediate', count: 8, seed });
        for (const question of questions) {
          const challenge = question.payload!;
          if (challenge.kind !== 'selectAllNames') continue;
          const expected = challenge
            .nameOptions!.filter((o) => o.valid)
            .map((o) => o.id)
            .sort()
            .join(',');
          expect(challenge.answer).toBe(expected);
          expect(question.answer).toBe(expected);
        }
      }
    });
  });
});
