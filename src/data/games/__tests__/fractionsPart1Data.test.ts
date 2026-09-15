import { describe, expect, it } from 'vitest';
import {
  collectionFraction,
  compareFractions,
  fractionNumberLinePosition,
  fractionsEquivalent,
  FRACTIONS_CHALLENGE_SESSION_SIZE,
  FRACTIONS_PART1_ACTIVITY_IDS,
  FRACTIONS_PART1_SESSION_SIZE,
  generateFractionActivity,
  isFractionChallengeCorrect,
} from '../fractionsPart1Data';

const ALL_SESSIONS = FRACTIONS_PART1_ACTIVITY_IDS.flatMap((activityId, activityIndex) =>
  Array.from({ length: 30 }, (_, seed) => generateFractionActivity(activityId, activityIndex * 1000 + seed)),
);
const ALL = ALL_SESSIONS.flat();

describe('Fractions Part 1 generators', () => {
  it('is deterministic for a seed and varied across seeds', () => {
    expect(generateFractionActivity('build-a-fraction', 42)).toEqual(generateFractionActivity('build-a-fraction', 42));
    expect(generateFractionActivity('build-a-fraction', 42)).not.toEqual(generateFractionActivity('build-a-fraction', 43));
  });

  it('builds complete sessions for every activity', () => {
    for (const activityId of FRACTIONS_PART1_ACTIVITY_IDS) {
      const session = generateFractionActivity(activityId, 77);
      expect(session).toHaveLength(
        activityId === 'fractions-challenge' ? FRACTIONS_CHALLENGE_SESSION_SIZE : FRACTIONS_PART1_SESSION_SIZE,
      );
      expect(new Set(session.map((challenge) => challenge.id)).size).toBe(session.length);
      expect(session.every((challenge) => challenge.activityId === activityId)).toBe(true);
    }
  });

  it('only creates valid, visible Grade 4 fractions', () => {
    for (const challenge of ALL) {
      expect(Number.isInteger(challenge.fraction.numerator)).toBe(true);
      expect(Number.isInteger(challenge.fraction.denominator)).toBe(true);
      expect(challenge.fraction.numerator).toBeGreaterThan(0);
      expect(challenge.fraction.numerator).toBeLessThan(challenge.fraction.denominator);
      expect([2, 3, 4, 5, 6, 8, 10, 12]).toContain(challenge.fraction.denominator);
    }
  });

  it('keeps selected visual parts consistent with numerator and denominator', () => {
    for (const challenge of ALL.filter((value) => value.selected.length > 0)) {
      expect(challenge.selected).toHaveLength(challenge.fraction.numerator);
      expect(new Set(challenge.selected).size).toBe(challenge.selected.length);
      expect(challenge.selected.every((index) => index >= 0 && index < challenge.fraction.denominator)).toBe(true);
    }
  });

  it('provides unique choices with exactly one correct answer', () => {
    for (const challenge of ALL.filter((value) => value.choices.length > 0)) {
      expect(new Set(challenge.choices.map((choice) => choice.value)).size).toBe(challenge.choices.length);
      expect(challenge.choices.filter((choice) => isFractionChallengeCorrect(challenge, choice.value))).toHaveLength(1);
    }
  });

  it('uses mathematically equivalent models without reduction rules', () => {
    for (const challenge of ALL.filter((value) => value.kind === 'equivalent')) {
      const answer = challenge.choices.find((choice) => choice.value === challenge.correctAnswer)!.fraction!;
      expect(fractionsEquivalent(answer, challenge.fraction)).toBe(true);
      for (const choice of challenge.choices.filter((value) => value.value !== challenge.correctAnswer)) {
        expect(fractionsEquivalent(choice.fraction!, challenge.fraction)).toBe(false);
      }
    }
  });

  it('computes comparison, line, and collection answers exactly', () => {
    expect(compareFractions({ numerator: 3, denominator: 4 }, { numerator: 2, denominator: 4 })).toBe('>');
    expect(compareFractions({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 })).toBe('=');
    expect(compareFractions({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 })).toBe('<');
    expect(fractionNumberLinePosition({ numerator: 3, denominator: 5 })).toBe(0.6);
    expect(collectionFraction(4, 10)).toEqual({ numerator: 4, denominator: 10 });

    for (const challenge of ALL.filter((value) => value.kind === 'compare')) {
      expect(challenge.correctAnswer).toBe(compareFractions(challenge.fraction, challenge.compareWith!));
    }
    for (const challenge of ALL.filter((value) => value.kind === 'numberLinePlace')) {
      expect(Number(challenge.correctAnswer) / challenge.fraction.denominator).toBe(fractionNumberLinePosition(challenge.fraction));
    }
    for (const challenge of ALL.filter((value) => value.kind === 'collection' && value.choices.length > 0)) {
      expect(challenge.fraction).toEqual(collectionFraction(challenge.collectionSelected!, challenge.collectionTotal!));
    }
  });

  it('mixes all prior concepts in the final challenge', () => {
    const session = generateFractionActivity('fractions-challenge', 9);
    expect(new Set(session.map((challenge) => challenge.kind))).toEqual(
      new Set(['build', 'terms', 'findModel', 'whole', 'equivalent', 'numberLinePlace', 'compare', 'collection', 'readModel']),
    );
  });
});
