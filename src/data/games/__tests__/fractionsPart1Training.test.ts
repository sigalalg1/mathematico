import { describe, expect, it } from 'vitest';
import type { FractionChallenge, FractionValue } from '../../../types/fractionsPart1';
import {
  asFractionDifficulty,
  COLLECTION_TOTALS,
  compareFractionValues,
  fractionDistance,
  fractionSign,
  fractionValueKey,
  fractionValuesEqual,
  isTeachableFraction,
  MODEL_DENOMINATORS,
  NUMBER_LINE_DENOMINATORS,
  PIZZA_DENOMINATORS,
  type FractionDifficultyId,
} from '../fractionDifficulty';
import {
  buildFractionTrainingQuestions,
  FRACTION_TRAINING_ACTIVITY_IDS,
  FRACTION_TRAINING_CAPABILITIES,
  fractionsPart1TrainingActivities,
  getFractionTrainingActivity,
  isFractionTrainingActivity,
  type FractionTrainingActivityId,
} from '../fractionsPart1Training';

const DIFFICULTIES: FractionDifficultyId[] = ['basic', 'intermediate', 'hard'];

/**
 * Seeded runs, so a failure can be reproduced exactly, and enough of them that
 * every branch of every generator is exercised many times over.
 */
function sessions(activityId: FractionTrainingActivityId, difficulty: FractionDifficultyId, runs = 25, count = 20) {
  return Array.from({ length: runs }, (_, seed) =>
    buildFractionTrainingQuestions(activityId, { difficultyId: difficulty, count, seed: seed + 1 }),
  );
}

function challengesOf(activityId: FractionTrainingActivityId, difficulty: FractionDifficultyId): FractionChallenge[] {
  return sessions(activityId, difficulty).flatMap((session) => session.map((question) => question.payload!));
}

const ALL: { activityId: FractionTrainingActivityId; difficulty: FractionDifficultyId; challenge: FractionChallenge }[] =
  FRACTION_TRAINING_ACTIVITY_IDS.flatMap((activityId) =>
    DIFFICULTIES.flatMap((difficulty) =>
      challengesOf(activityId, difficulty).map((challenge) => ({ activityId, difficulty, challenge })),
    ),
  );

/** The denominators a level is allowed to produce for a given activity. */
function allowedDenominators(activityId: FractionTrainingActivityId, difficulty: FractionDifficultyId): readonly number[] {
  if (activityId === 'fraction-pizzeria') return PIZZA_DENOMINATORS[difficulty];
  if (activityId === 'fraction-number-line') return NUMBER_LINE_DENOMINATORS[difficulty];
  if (activityId === 'fraction-of-collection') return COLLECTION_TOTALS[difficulty];
  return MODEL_DENOMINATORS[difficulty];
}

describe('exact fraction arithmetic', () => {
  it('compares and equates by cross-multiplication, never by decimal value', () => {
    expect(fractionSign({ numerator: 3, denominator: 4 }, { numerator: 2, denominator: 4 })).toBe('>');
    expect(fractionSign({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 })).toBe('<');
    // The cases a float gets wrong: equal values with different denominators…
    expect(fractionSign({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 3 })).toBe('=');
    expect(fractionValuesEqual({ numerator: 9, denominator: 12 }, { numerator: 3, denominator: 4 })).toBe(true);
    expect(fractionValuesEqual({ numerator: 5, denominator: 10 }, { numerator: 1, denominator: 2 })).toBe(true);
    // …and values whose decimals collide only after rounding.
    expect(fractionValuesEqual({ numerator: 1, denominator: 3 }, { numerator: 33, denominator: 100 })).toBe(false);
    expect(compareFractionValues({ numerator: 5, denominator: 8 }, { numerator: 2, denominator: 3 })).toBe(-1);
    expect(compareFractionValues({ numerator: 3, denominator: 4 }, { numerator: 7, denominator: 10 })).toBe(1);
  });

  it('measures distance exactly', () => {
    expect(fractionDistance({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 })).toEqual({
      numerator: 1,
      denominator: 6,
    });
    expect(fractionDistance({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 })).toEqual({
      numerator: 0,
      denominator: 18,
    });
  });

  it('falls back to the first level for an unknown or missing difficulty', () => {
    expect(asFractionDifficulty(null)).toBe('basic');
    expect(asFractionDifficulty('legendary')).toBe('basic');
    expect(asFractionDifficulty('hard')).toBe('hard');
  });
});

describe('fraction training capabilities', () => {
  it('offers depth and length, and no timed challenge at all', () => {
    expect(FRACTION_TRAINING_CAPABILITIES.questionCounts).toEqual([5, 10, 20]);
    expect(FRACTION_TRAINING_CAPABILITIES.difficulties.map((option) => option.id)).toEqual(DIFFICULTIES);
    // The architectural point: challenge support is declared off, not merely
    // left unrendered, and no question count is challenge-eligible.
    expect(FRACTION_TRAINING_CAPABILITIES.supportsChallenge).toBe(false);
    expect(FRACTION_TRAINING_CAPABILITIES.challengeQuestionCounts).toEqual([]);
  });

  it('covers every listed activity except the closing fixed review', () => {
    expect(fractionsPart1TrainingActivities.map((activity) => activity.id)).toEqual([...FRACTION_TRAINING_ACTIVITY_IDS]);
    for (const activityId of FRACTION_TRAINING_ACTIVITY_IDS) {
      expect(getFractionTrainingActivity(activityId)).toBeDefined();
      expect(isFractionTrainingActivity(activityId)).toBe(true);
    }
    expect(getFractionTrainingActivity('fractions-challenge')).toBeUndefined();
    expect(isFractionTrainingActivity('fractions-challenge')).toBe(false);
    expect(isFractionTrainingActivity('build-the-whole')).toBe(false);
  });
});

describe('fraction training sessions', () => {
  it('is reproducible from a seed and varied without one', () => {
    const first = buildFractionTrainingQuestions('find-the-fraction', { difficultyId: 'hard', count: 10, seed: 7 });
    const again = buildFractionTrainingQuestions('find-the-fraction', { difficultyId: 'hard', count: 10, seed: 7 });
    const other = buildFractionTrainingQuestions('find-the-fraction', { difficultyId: 'hard', count: 10, seed: 8 });
    expect(first).toEqual(again);
    expect(first).not.toEqual(other);
  });

  it.each(FRACTION_TRAINING_ACTIVITY_IDS)('builds exactly the requested number of questions for %s', (activityId) => {
    for (const difficulty of DIFFICULTIES) {
      for (const count of FRACTION_TRAINING_CAPABILITIES.questionCounts) {
        const questions = buildFractionTrainingQuestions(activityId, { difficultyId: difficulty, count, seed: count });
        expect(questions).toHaveLength(count);
        expect(new Set(questions.map((question) => question.id)).size).toBe(count);
        for (const question of questions) {
          expect(question.prompt.length).toBeGreaterThan(0);
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
          expect(question.payload).toBeDefined();
        }
      }
    }
  });

  it('only ever produces proper fractions of one whole', () => {
    for (const { activityId, challenge } of ALL) {
      const maxDenominator = activityId === 'fraction-of-collection' ? 20 : 12;
      expect(isTeachableFraction(challenge.fraction, maxDenominator)).toBe(true);
      if (challenge.compareWith) expect(isTeachableFraction(challenge.compareWith, maxDenominator)).toBe(true);
    }
  });

  it('keeps every question inside its own difficulty, for the whole session', () => {
    for (const activityId of FRACTION_TRAINING_ACTIVITY_IDS) {
      for (const difficulty of DIFFICULTIES) {
        const allowed = allowedDenominators(activityId, difficulty);
        for (const challenge of challengesOf(activityId, difficulty)) {
          // The equivalence activity shows a fraction in lowest terms next to
          // the same value scaled up; both stay within the unit's cap.
          if (challenge.kind === 'equivalent') {
            expect(challenge.fraction.denominator).toBeLessThanOrEqual(12);
            continue;
          }
          if (challenge.correctAnswer === '=') {
            // An equal pair is the one place a level deliberately reaches for a
            // smaller denominator: 4/6 against 2/3 only works written that way.
            expect(challenge.fraction.denominator).toBeLessThanOrEqual(Math.max(...allowed));
            expect(challenge.compareWith!.denominator).toBeLessThanOrEqual(Math.max(...allowed));
            continue;
          }
          const denominator = challenge.collectionTotal ?? challenge.fraction.denominator;
          expect(allowed).toContain(denominator);
          if (challenge.compareWith) expect(allowed).toContain(challenge.compareWith.denominator);
        }
      }
    }
  });

  it('separates the levels: harder means mathematically bigger, everywhere', () => {
    for (const activityId of FRACTION_TRAINING_ACTIVITY_IDS) {
      const ceilings = DIFFICULTIES.map((difficulty) => Math.max(...allowedDenominators(activityId, difficulty)));
      expect(ceilings[0]).toBeLessThan(ceilings[1]);
      expect(ceilings[1]).toBeLessThan(ceilings[2]);
    }
  });

  it('shades exactly as many parts as the numerator says', () => {
    for (const { challenge } of ALL.filter((entry) => entry.challenge.selected.length > 0)) {
      expect(challenge.selected).toHaveLength(challenge.fraction.numerator);
      expect(new Set(challenge.selected).size).toBe(challenge.selected.length);
      for (const index of challenge.selected) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(challenge.fraction.denominator);
      }
    }
  });

  it('offers one correct answer and no accidental second one', () => {
    for (const { challenge } of ALL.filter((entry) => entry.challenge.choices.length > 0)) {
      const values = challenge.choices.map((choice) => choice.value);
      expect(new Set(values).size).toBe(values.length);
      expect(values).toContain(challenge.correctAnswer);

      const correct = challenge.choices.find((choice) => choice.value === challenge.correctAnswer)!;
      if (!correct.fraction) continue;
      // A distractor equal in value to the answer would be a second right
      // answer wearing a different denominator — checked exactly, not by float.
      for (const choice of challenge.choices) {
        if (choice.value === challenge.correctAnswer) continue;
        expect(fractionValuesEqual(choice.fraction!, correct.fraction)).toBe(false);
      }
    }
  });

  it('derives the answer from the model it draws, never independently', () => {
    for (const { challenge } of ALL) {
      if (challenge.kind === 'build' || challenge.kind === 'pizzaBuild') {
        expect(challenge.correctAnswer).toBe(String(challenge.fraction.numerator));
      }
      if (challenge.kind === 'readModel' || challenge.kind === 'pizzaRead') {
        expect(challenge.correctAnswer).toBe(fractionValueKey(challenge.fraction));
        expect(challenge.selected).toHaveLength(challenge.fraction.numerator);
      }
      if (challenge.kind === 'terms') {
        const asksNumerator = challenge.termTarget === 'numerator' || challenge.termTarget === 'selected';
        expect(challenge.correctAnswer).toBe(
          String(asksNumerator ? challenge.fraction.numerator : challenge.fraction.denominator),
        );
      }
      if (challenge.kind === 'collection' && challenge.choices.length > 0) {
        expect(challenge.fraction).toEqual({
          numerator: challenge.collectionSelected,
          denominator: challenge.collectionTotal,
        });
        expect(challenge.correctAnswer).toBe(fractionValueKey(challenge.fraction));
      }
      if (challenge.kind === 'collection' && challenge.choices.length === 0) {
        expect(challenge.correctAnswer).toBe(String(challenge.fraction.numerator));
        expect(challenge.collectionSelected).toBe(0);
      }
    }
  });

  it('marks the number line at the position the fraction actually has', () => {
    for (const { challenge } of ALL.filter((entry) => entry.challenge.kind === 'numberLinePlace')) {
      const tick = Number(challenge.correctAnswer);
      expect(Number.isInteger(tick)).toBe(true);
      expect(tick).toBeGreaterThan(0);
      expect(tick).toBeLessThan(challenge.fraction.denominator);
      // tick / denominator is the fraction itself — as an exact equality.
      expect(
        fractionValuesEqual({ numerator: tick, denominator: challenge.fraction.denominator }, challenge.fraction),
      ).toBe(true);
      // Every tick of the line is offered, and only ticks.
      expect(challenge.choices.map((choice) => choice.value)).toEqual(
        Array.from({ length: challenge.fraction.denominator + 1 }, (_, value) => String(value)),
      );
    }
  });

  it('never carries a fraction value into a question that asks for it', () => {
    for (const { challenge } of ALL) {
      if (challenge.kind === 'numberLineRead') {
        // The scene is given only a denominator and a marked tick; the choices
        // are the only place a value is written.
        expect(challenge.choices.every((choice) => choice.fraction !== undefined)).toBe(true);
      }
      if (challenge.kind === 'compare') {
        // The comparison scene renders shapes only; no choice carries a value.
        expect(challenge.choices.map((choice) => choice.value)).toEqual(['<', '>', '=']);
      }
    }
  });

  it('answers every comparison exactly, including the equal ones', () => {
    const signs = new Set<string>();
    for (const { challenge } of ALL.filter((entry) => entry.challenge.kind === 'compare')) {
      expect(challenge.correctAnswer).toBe(fractionSign(challenge.fraction, challenge.compareWith!));
      signs.add(challenge.correctAnswer);
    }
    // All three signs must be reachable, or "=" would be a dead button.
    expect(signs).toEqual(new Set(['<', '>', '=']));
  });

  it('grades comparisons: basic keeps a term fixed, hard closes the gap', () => {
    const basic = challengesOf('which-is-greater', 'basic');
    for (const challenge of basic) {
      const left = challenge.fraction;
      const right = challenge.compareWith!;
      expect(left.numerator === right.numerator || left.denominator === right.denominator).toBe(true);
      expect(fractionValuesEqual(left, right)).toBe(false);
    }

    const intermediate = challengesOf('which-is-greater', 'intermediate');
    for (const challenge of intermediate) {
      expect(fractionValuesEqual(challenge.fraction, challenge.compareWith!)).toBe(false);
    }

    const hard = challengesOf('which-is-greater', 'hard');
    const equalPairs = hard.filter((challenge) => challenge.correctAnswer === '=');
    // Only hard puts genuinely equal fractions side by side.
    expect(equalPairs.length).toBeGreaterThan(0);
    expect(basic.some((challenge) => challenge.correctAnswer === '=')).toBe(false);
    expect(intermediate.some((challenge) => challenge.correctAnswer === '=')).toBe(false);

    const closeness = (challenges: FractionChallenge[]) =>
      challenges
        .filter((challenge) => challenge.correctAnswer !== '=')
        .map((challenge) => {
          const gap = fractionDistance(challenge.fraction, challenge.compareWith!);
          return gap.numerator / gap.denominator;
        });
    const averageOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    // Hard puts the two amounts closer together than intermediate does.
    expect(averageOf(closeness(hard))).toBeLessThan(averageOf(closeness(intermediate)));
    // And the two levels sit on opposite sides of the same explicit threshold:
    // intermediate always leaves a visible gap, hard never does.
    expect(Math.min(...closeness(intermediate))).toBeGreaterThanOrEqual(1 / 10);
    expect(Math.max(...closeness(hard))).toBeLessThan(1 / 10);
  });

  it('keeps equivalence questions genuinely equivalent, and only one of them', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const challenge of challengesOf('same-fraction', difficulty)) {
        const answer = challenge.choices.find((choice) => choice.value === challenge.correctAnswer)!.fraction!;
        expect(fractionValuesEqual(answer, challenge.fraction)).toBe(true);
        // The answer is written with a different denominator — otherwise the
        // question is "find the identical fraction", not "find the same amount".
        expect(answer.denominator).not.toBe(challenge.fraction.denominator);
        for (const choice of challenge.choices) {
          if (choice.value === challenge.correctAnswer) continue;
          expect(fractionValuesEqual(choice.fraction!, challenge.fraction)).toBe(false);
        }
      }
    }
  });

  it('keeps basic distractors clearly apart and hard ones genuinely close', () => {
    const nearestDistractor = (challenge: FractionChallenge): number | null => {
      const correct = challenge.choices.find((choice) => choice.value === challenge.correctAnswer)?.fraction;
      if (!correct) return null;
      const gaps = challenge.choices
        .filter((choice) => choice.value !== challenge.correctAnswer && choice.fraction)
        .map((choice) => {
          const gap = fractionDistance(choice.fraction as FractionValue, correct);
          return gap.numerator / gap.denominator;
        });
      return gaps.length > 0 ? Math.min(...gaps) : null;
    };

    for (const activityId of ['find-the-fraction', 'build-a-fraction'] as const) {
      const gapsFor = (difficulty: FractionDifficultyId) =>
        challengesOf(activityId, difficulty)
          .map(nearestDistractor)
          .filter((value): value is number => value !== null);

      const basic = gapsFor('basic');
      const hard = gapsFor('hard');
      expect(basic.length).toBeGreaterThan(0);
      // Basic never puts a wrong answer within an eighth of the right one.
      expect(Math.min(...basic)).toBeGreaterThanOrEqual(1 / 8);
      // Hard does, which is what makes it require a second look.
      expect(Math.min(...hard)).toBeLessThan(1 / 8);
    }
  });

  it('keeps a twenty-question session varied rather than one fraction repeated', () => {
    for (const activityId of FRACTION_TRAINING_ACTIVITY_IDS) {
      for (const difficulty of DIFFICULTIES) {
        for (const session of sessions(activityId, difficulty, 10, 20)) {
          const keys = session.map((question) => {
            const challenge = question.payload!;
            return `${challenge.kind}:${fractionValueKey(challenge.fraction)}:${
              challenge.compareWith ? fractionValueKey(challenge.compareWith) : ''
            }`;
          });
          // Never the same question twice in a row…
          for (let index = 1; index < keys.length; index++) {
            expect(keys[index]).not.toBe(keys[index - 1]);
          }
          // …and a real spread, even where the level has few fractions to give.
          expect(new Set(keys).size).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });
});
