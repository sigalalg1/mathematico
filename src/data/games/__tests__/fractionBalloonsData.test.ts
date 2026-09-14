import { describe, expect, it } from 'vitest';
import {
  BALLOONS_PER_QUESTION,
  FRACTION_BALLOONS_TOTAL,
  FRACTION_BALLOON_FRACTIONS,
  buildFractionBalloonQuestions,
  sameFraction,
} from '../fractionBalloonsData';
import type { BalloonFraction, BalloonQuestion } from '../../../types/fractionBalloons';

const RUNS = 200;
const SESSIONS: BalloonQuestion[][] = Array.from({ length: RUNS }, () => buildFractionBalloonQuestions());
const ALL = SESSIONS.flat();

const key = (fraction: BalloonFraction) => `${fraction.numerator}/${fraction.denominator}`;
const inSet = (fraction: BalloonFraction) => FRACTION_BALLOON_FRACTIONS.some((known) => sameFraction(known, fraction));

describe('fraction balloons — generated questions', () => {
  it('builds a full session of questions', () => {
    for (const session of SESSIONS) {
      expect(session).toHaveLength(FRACTION_BALLOONS_TOTAL);
    }
  });

  it('only produces legal simple fractions from the configured set', () => {
    for (const question of ALL) {
      for (const fraction of [question.target, ...question.options]) {
        expect(fraction.denominator).toBeGreaterThan(0);
        expect(fraction.numerator).toBeGreaterThan(0);
        expect(fraction.numerator).toBeLessThanOrEqual(fraction.denominator);
        expect(inSet(fraction)).toBe(true);
      }
    }
  });

  it('floats four balloons with exactly one correct answer per question', () => {
    for (const question of ALL) {
      expect(question.options).toHaveLength(BALLOONS_PER_QUESTION);
      expect(question.options.filter((option) => sameFraction(option, question.target))).toHaveLength(1);
    }
  });

  it('keeps the distractors distinct from the answer and from each other, in value too', () => {
    for (const question of ALL) {
      const keys = new Set(question.options.map(key));
      expect(keys.size).toBe(BALLOONS_PER_QUESTION);
      // 1/2 and 2/4 must never float together: both taps would be defensible.
      const values = new Set(question.options.map((option) => option.numerator / option.denominator));
      expect(values.size).toBe(BALLOONS_PER_QUESTION);
    }
  });

  it('colours in exactly numerator pieces on a visual question and none on a symbolic one', () => {
    for (const question of ALL) {
      if (question.kind === 'visual') {
        expect(question.selectedPieces).toHaveLength(question.target.numerator);
        expect(new Set(question.selectedPieces).size).toBe(question.target.numerator);
        for (const index of question.selectedPieces) {
          expect(index).toBeLessThan(question.target.denominator);
        }
      } else {
        expect(question.selectedPieces).toHaveLength(0);
      }
    }
  });

  it('asks both question kinds in every session', () => {
    for (const session of SESSIONS) {
      expect(new Set(session.map((question) => question.kind)).size).toBe(2);
    }
  });
});
