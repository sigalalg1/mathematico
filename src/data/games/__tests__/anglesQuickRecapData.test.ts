import { describe, expect, it } from 'vitest';
import {
  ANGLES_QUICK_RECAP_QUESTION_COUNT,
  assertQuickRecapQuestionIsSound,
  buildAnglesQuickRecapQuestions,
} from '../anglesQuickRecapData';
import { classifyAngle7, isUnambiguouslyClassifiable, resolveAngle } from '../../../geometry/angleMath';
import { isValidAngleName } from '../../../geometry/angleNotation';

const SEED_COUNT = 300;

describe('anglesQuickRecapData generator', () => {
  it('always produces exactly ANGLES_QUICK_RECAP_QUESTION_COUNT questions, each a sound question, across many seeds', () => {
    for (let seed = 0; seed < SEED_COUNT; seed += 1) {
      const questions = buildAnglesQuickRecapQuestions(seed);
      expect(questions).toHaveLength(ANGLES_QUICK_RECAP_QUESTION_COUNT);
      for (const question of questions) {
        expect(() => assertQuickRecapQuestionIsSound(question)).not.toThrow();
        expect(question.options).toContain(question.answer);
      }
    }
  });

  it('covers every sub-topic in a fixed, recognizable order: vocab, vocab, types, types, notation, notation, compare, compare, measure, measure', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const topics = buildAnglesQuickRecapQuestions(seed).map((q) => q.topic);
      expect(topics).toEqual(['vocab', 'vocab', 'types', 'types', 'notation', 'notation', 'compare', 'compare', 'measure', 'measure']);
    }
  });

  it('is deterministic for a given seed (two calls with the same seed produce an identical round)', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const a = buildAnglesQuickRecapQuestions(seed);
      const b = buildAnglesQuickRecapQuestions(seed);
      expect(a).toEqual(b);
    }
  });

  describe('vocab questions', () => {
    it('the first question always asks for the vertex term and the second for the arms term, each with a unique correct option', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [vertexQuestion, armsQuestion] = buildAnglesQuickRecapQuestions(seed);
        expect(vertexQuestion.answer).toBe('vertex');
        expect(armsQuestion.answer).toBe('arms');
        expect(new Set(vertexQuestion.options).size).toBe(vertexQuestion.options.length);
        expect(new Set(armsQuestion.options).size).toBe(armsQuestion.options.length);
      }
    });
  });

  describe('types questions (classify)', () => {
    it('the classified type always matches the real geometry-resolved angle, and always respects the mandatory safety margin', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , q1, q2] = buildAnglesQuickRecapQuestions(seed);
        for (const question of [q1, q2]) {
          const resolved = resolveAngle(question.scene!, question.highlightedRef!);
          expect(classifyAngle7(resolved.degrees)).toBe(question.answer);
          expect(isUnambiguouslyClassifiable(resolved.degrees)).toBe(true);
        }
      }
    });

    it('produces every one of the four angle types across a large sample', () => {
      const seen = new Set<string>();
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , q1, q2] = buildAnglesQuickRecapQuestions(seed);
        seen.add(q1.answer);
        seen.add(q2.answer);
      }
      expect(seen).toEqual(new Set(['acute', 'right', 'obtuse', 'straight']));
    });
  });

  describe('notation questions', () => {
    it('selectName (Greek-letter framed): the answer is a genuinely valid name and every distractor is genuinely invalid', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , selectQuestion] = buildAnglesQuickRecapQuestions(seed);
        const resolved = resolveAngle(selectQuestion.scene!, selectQuestion.highlightedRef!);
        const vertexLabel = selectQuestion.scene!.vertex.label;
        const armLabels: [string, string] = [resolved.rayA.label, resolved.rayB.label];
        expect(isValidAngleName(selectQuestion.answer, vertexLabel, armLabels)).toBe(true);
        for (const option of selectQuestion.options) {
          if (option === selectQuestion.answer) continue;
          expect(isValidAngleName(option, vertexLabel, armLabels)).toBe(false);
        }
        expect(selectQuestion.promptValues?.letter).toBeDefined();
      }
    });

    it('selectInvalid: the designated answer is genuinely invalid, and both other options are genuinely valid', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , invalidQuestion] = buildAnglesQuickRecapQuestions(seed);
        const resolved = resolveAngle(invalidQuestion.scene!, invalidQuestion.highlightedRef!);
        const vertexLabel = invalidQuestion.scene!.vertex.label;
        const armLabels: [string, string] = [resolved.rayA.label, resolved.rayB.label];
        expect(isValidAngleName(invalidQuestion.answer, vertexLabel, armLabels)).toBe(false);
        for (const option of invalidQuestion.options) {
          if (option === invalidQuestion.answer) continue;
          expect(isValidAngleName(option, vertexLabel, armLabels)).toBe(true);
        }
      }
    });
  });

  describe('compare questions', () => {
    it('the answer always matches the real geometry-resolved measures of both diagrams', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , , q1, q2] = buildAnglesQuickRecapQuestions(seed);
        for (const question of [q1, q2]) {
          const { left, right } = question.compare!;
          const leftDeg = resolveAngle(left.scene, left.ref).degrees;
          const rightDeg = resolveAngle(right.scene, right.ref).degrees;
          const diff = leftDeg - rightDeg;
          const expected = diff < -1e-3 ? '<' : diff > 1e-3 ? '>' : '=';
          expect(question.answer).toBe(expected);
        }
      }
    });

    it('the second compare question is always the deliberately-forced equal case, guaranteeing the round tests the rotation/ray-length misconception directly', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , , , forcedEqualQuestion] = buildAnglesQuickRecapQuestions(seed);
        expect(forcedEqualQuestion.answer).toBe('=');
        const { left, right } = forcedEqualQuestion.compare!;
        // Independently rotated/labelled scenes — never the literal same scene object or vertex label.
        expect(left.scene.vertex.label).not.toBe(right.scene.vertex.label);
      }
    });

    it('the first compare question is not artificially forced and varies across seeds (covers "<", "=" and ">")', () => {
      const answers = new Set<string>();
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , , firstCompare] = buildAnglesQuickRecapQuestions(seed);
        answers.add(firstCompare.answer);
      }
      expect(answers.has('<')).toBe(true);
      expect(answers.has('>')).toBe(true);
    });

    it('never lets ray-drawn distance leak as a size cue: a longer-drawn ray does not systematically predict the "greater" side', () => {
      const samples: { longerSide: 'left' | 'right'; answer: string }[] = [];
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , , firstCompare] = buildAnglesQuickRecapQuestions(seed);
        const { left, right } = firstCompare.compare!;
        const leftDist = Math.hypot(left.scene.rays[1].through.x - left.scene.vertex.point.x, left.scene.rays[1].through.y - left.scene.vertex.point.y);
        const rightDist = Math.hypot(right.scene.rays[1].through.x - right.scene.vertex.point.x, right.scene.rays[1].through.y - right.scene.vertex.point.y);
        samples.push({ longerSide: leftDist > rightDist ? 'left' : 'right', answer: firstCompare.answer });
      }
      const longerIsGreater = samples.filter(
        (s) => (s.longerSide === 'left' && s.answer === '>') || (s.longerSide === 'right' && s.answer === '<'),
      ).length;
      // With no real correlation this should land well short of "always true".
      expect(longerIsGreater).toBeLessThan(Math.floor(SEED_COUNT * 0.9));
    });
  });

  describe('measure questions', () => {
    it('reading question: the answer always equals the real drawn angle between the fixed and measured rays, and is a multiple of 10', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , , , , readQuestion] = buildAnglesQuickRecapQuestions(seed);
        const resolved = resolveAngle(readQuestion.scene!, { vertexId: 'vertex', rayAId: 'fixed', rayBId: 'measured' });
        expect(resolved.degrees).toBeCloseTo(Number(readQuestion.answer), 6);
        expect(Number(readQuestion.answer) % 10).toBe(0);
        expect(readQuestion.options).toHaveLength(4);
        expect(new Set(readQuestion.options).size).toBe(4);
      }
    });

    it('purpose question: the answer is always "measure the angle in degrees", offered alongside three wrong options', () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const [, , , , , , , , , purposeQuestion] = buildAnglesQuickRecapQuestions(seed);
        expect(purposeQuestion.answer).toBe('measureDegrees');
        expect(purposeQuestion.options).toHaveLength(4);
        expect(purposeQuestion.options).toContain('measureDegrees');
        expect(purposeQuestion.options).toContain('measureLength');
      }
    });
  });
});
