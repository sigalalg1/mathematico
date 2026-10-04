import type { FractionValue } from '../../types/fractionsPart1';
import { pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';

/**
 * The mathematical rules behind the fraction unit's difficulty levels.
 *
 * Everything here is exact integer arithmetic. Two fractions are never compared
 * through their decimal value: `4/6` and `2/3` are the same number, and `0.6`
 * is not `3/5`, so a float would both miss equivalences and invent differences.
 * Comparisons and equality go through cross-multiplication only.
 *
 * A level means *which fractions exist*, never how the screen looks: the same
 * models, the same wording and the same interactions are used at every level.
 */

export type FractionDifficultyId = 'basic' | 'intermediate' | 'hard';

export const FRACTION_DIFFICULTY_IDS = ['basic', 'intermediate', 'hard'] as const;

/** The largest denominator this grade 3–4 unit ever produces. */
export const FRACTION_MAX_DENOMINATOR = 12;

/** Clamps a stored or linked difficulty onto a level this unit actually has. */
export function asFractionDifficulty(difficultyId: string | null | undefined): FractionDifficultyId {
  return (FRACTION_DIFFICULTY_IDS as readonly string[]).includes(difficultyId ?? '')
    ? (difficultyId as FractionDifficultyId)
    : 'basic';
}

/** `-1`, `0` or `1` — exact, by cross-multiplication. */
export function compareFractionValues(left: FractionValue, right: FractionValue): -1 | 0 | 1 {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference === 0 ? 0 : difference > 0 ? 1 : -1;
}

/** True for genuinely equal values, including different-looking ones like 4/6 and 2/3. */
export function fractionValuesEqual(left: FractionValue, right: FractionValue): boolean {
  return compareFractionValues(left, right) === 0;
}

/** The comparison sign the child has to choose. */
export function fractionSign(left: FractionValue, right: FractionValue): '<' | '>' | '=' {
  const order = compareFractionValues(left, right);
  return order === 0 ? '=' : order > 0 ? '>' : '<';
}

export function fractionValueKey(fraction: FractionValue): string {
  return `${fraction.numerator}/${fraction.denominator}`;
}

/**
 * A fraction this unit is allowed to show: a proper fraction of a single whole.
 * `maxDenominator` is raised only by the collection activity, where the "whole"
 * is a group of up to twenty objects rather than a shape cut into parts.
 */
export function isTeachableFraction(fraction: FractionValue, maxDenominator = FRACTION_MAX_DENOMINATOR): boolean {
  const { numerator, denominator } = fraction;
  return (
    Number.isInteger(numerator) &&
    Number.isInteger(denominator) &&
    denominator >= 2 &&
    denominator <= maxDenominator &&
    numerator >= 1 &&
    numerator < denominator
  );
}

/**
 * Denominators per level for the shaded-model activities (pie, bar, grid).
 *
 * Basic stays on the denominators a child meets first and can count at a
 * glance. Intermediate goes up to ten, so the model has to be read rather than
 * recognised. Hard adds the awkward denominators (7, 9, 11 excluded only
 * because eleven equal parts stop being legible) — demanding to read, never
 * unreadable.
 */
export const MODEL_DENOMINATORS: Record<FractionDifficultyId, readonly number[]> = {
  basic: [2, 3, 4],
  intermediate: [3, 4, 5, 6, 8, 10],
  hard: [5, 6, 7, 8, 9, 10, 12],
};

/** A pie is cut into wedges, so very fine cuts stop being countable earlier. */
export const PIZZA_DENOMINATORS: Record<FractionDifficultyId, readonly number[]> = {
  basic: [2, 3, 4],
  intermediate: [5, 6, 8],
  hard: [8, 9, 10, 12],
};

/** Ticks on a 0–1 line stay tappable on a phone up to twelve intervals. */
export const NUMBER_LINE_DENOMINATORS: Record<FractionDifficultyId, readonly number[]> = {
  basic: [2, 3, 4],
  intermediate: [5, 6, 8, 10],
  hard: [7, 8, 9, 10, 12],
};

/** Group sizes for "what fraction of the collection is coloured?". */
export const COLLECTION_TOTALS: Record<FractionDifficultyId, readonly number[]> = {
  basic: [4, 6],
  intermediate: [6, 8, 10],
  hard: [12, 15, 16, 18, 20],
};

/** Draws a proper fraction whose denominator comes from the level's pool. */
export function drawFraction(random: () => number, denominators: readonly number[]): FractionValue {
  const denominator = pickRandom(random, denominators);
  return { numerator: randomInt(random, 1, denominator - 1), denominator };
}

/**
 * Builds `count` items while keeping a session varied: a candidate that repeats
 * something from the last `window` items is re-drawn, up to `attempts` times.
 * Deliberately a nudge, not a guarantee — a five-question basic round only has
 * six distinct fractions to offer, and refusing to repeat at all would either
 * fail or distort the level.
 */
export function drawSeries<T>(
  count: number,
  make: (index: number) => T,
  key: (item: T) => string,
  { window = 3, attempts = 12 }: { window?: number; attempts?: number } = {},
): T[] {
  const items: T[] = [];
  const keys: string[] = [];

  for (let index = 0; index < count; index++) {
    let candidate = make(index);
    for (let attempt = 1; attempt < attempts && keys.slice(-window).includes(key(candidate)); attempt++) {
      candidate = make(index);
    }
    items.push(candidate);
    keys.push(key(candidate));
  }

  return items;
}

/** Exact ordering of two distances held as fractions, so no float ever decides. */
function compareDistances(a: FractionValue, b: FractionValue): number {
  return a.numerator * b.denominator - b.numerator * a.denominator;
}

/** |left − right| as an exact fraction. */
export function fractionDistance(left: FractionValue, right: FractionValue): FractionValue {
  return {
    numerator: Math.abs(left.numerator * right.denominator - right.numerator * left.denominator),
    denominator: left.denominator * right.denominator,
  };
}

/** True when |left − right| ≥ bound, exactly. */
export function distanceAtLeast(left: FractionValue, right: FractionValue, bound: FractionValue): boolean {
  return compareDistances(fractionDistance(left, right), bound) >= 0;
}

/** How far apart "clearly different" and "close" sit, per level. */
const CLEAR_GAP: FractionValue = { numerator: 1, denominator: 8 };
const REASONING_GAP: FractionValue = { numerator: 1, denominator: 10 };

/**
 * Wrong answers a child could actually arrive at, rather than arbitrary
 * numbers: counting the parts that are *not* shaded, miscounting by one part or
 * one cut, and swapping the two terms of the fraction.
 *
 * Never returns a value equal to the target — an equivalent fraction would be a
 * second correct answer, not a distractor.
 */
export function fractionDistractors(
  random: () => number,
  target: FractionValue,
  difficulty: FractionDifficultyId,
  count: number,
  { pool = MODEL_DENOMINATORS[difficulty], maxDenominator = FRACTION_MAX_DENOMINATOR }: {
    pool?: readonly number[];
    maxDenominator?: number;
  } = {},
): FractionValue[] {
  const { numerator, denominator } = target;
  const candidates: FractionValue[] = [
    // Counted one shaded part too many / too few.
    { numerator: numerator + 1, denominator },
    { numerator: numerator - 1, denominator },
    // Read the parts that are left over instead of the ones that are taken.
    { numerator: denominator - numerator, denominator },
    // Numerator and denominator the wrong way round.
    { numerator: denominator, denominator: numerator },
    // Miscounted how many equal parts the whole was cut into.
    { numerator, denominator: denominator + 1 },
    { numerator, denominator: denominator - 1 },
    // "A bigger denominator must mean a bigger fraction."
    { numerator, denominator: denominator * 2 },
    { numerator: numerator + 1, denominator: denominator + 1 },
  ];

  const seen = new Set([fractionValueKey(target)]);
  let usable = candidates.filter((candidate) => {
    if (!isTeachableFraction(candidate, maxDenominator) || fractionValuesEqual(candidate, target)) return false;
    const key = fractionValueKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (difficulty === 'basic') {
    // Basic must not punish a child who has the idea right: the wrong answers
    // stay visibly far from the target, and the farthest come first.
    const clear = usable.filter((candidate) => distanceAtLeast(candidate, target, CLEAR_GAP));
    usable = [...clear, ...usable.filter((candidate) => !clear.includes(candidate))].sort((a, b) =>
      compareDistances(fractionDistance(b, target), fractionDistance(a, target)),
    );
  } else if (difficulty === 'hard') {
    // Hard asks for a real second look: the nearest plausible mistakes first.
    usable = [...usable].sort((a, b) => compareDistances(fractionDistance(a, target), fractionDistance(b, target)));
  }

  // Top up from the level's own denominators if the misconceptions ran out.
  for (const denominatorOption of pool) {
    if (usable.length >= count) break;
    for (let candidateNumerator = 1; candidateNumerator < denominatorOption && usable.length < count; candidateNumerator++) {
      const candidate = { numerator: candidateNumerator, denominator: denominatorOption };
      const key = fractionValueKey(candidate);
      if (seen.has(key) || fractionValuesEqual(candidate, target)) continue;
      seen.add(key);
      usable.push(candidate);
    }
  }

  // A stable set, presented in an unpredictable order.
  return shuffle(usable.slice(0, count), random);
}

/**
 * The two fractions a comparison question puts side by side.
 *
 * Basic keeps one of the two terms fixed, which is the comparison a child can
 * reason about from the picture alone. Intermediate varies both terms but keeps
 * a visible gap. Hard closes the gap and, part of the time, makes the two
 * models genuinely equal — the case where "=" is the answer and counting parts
 * is not enough.
 */
export function comparisonPair(
  random: () => number,
  difficulty: FractionDifficultyId,
): [FractionValue, FractionValue] {
  if (difficulty === 'basic') {
    const denominators = MODEL_DENOMINATORS.basic;
    if (random() < 0.5) {
      // Same whole, different number of parts taken: 3/4 against 1/4.
      const denominator = pickRandom(random, denominators.filter((value) => value >= 3));
      const left = randomInt(random, 1, denominator - 1);
      const right = left === 1 ? denominator - 1 : 1;
      return [
        { numerator: left, denominator },
        { numerator: right, denominator },
      ];
    }
    // Same number of parts, different sized parts: 1/2 against 1/4.
    const [small, large] = random() < 0.5 ? [2, 4] : pickRandom(random, [[2, 3], [3, 4], [2, 4]] as const);
    return [
      { numerator: 1, denominator: small },
      { numerator: 1, denominator: large },
    ];
  }

  const pool = MODEL_DENOMINATORS[difficulty];

  if (difficulty === 'hard' && random() < 0.35) {
    // Equal values wearing different denominators: 4/6 against 2/3.
    const { base, equivalent } = equivalencePair(random, 'hard');
    return random() < 0.5 ? [base, equivalent] : [equivalent, base];
  }

  const wantsClearGap = difficulty === 'intermediate';
  let left = drawFraction(random, pool);
  let right = drawFraction(random, pool);

  for (let attempt = 0; attempt < 60; attempt++) {
    const differentTerms = left.denominator !== right.denominator && left.numerator !== right.numerator;
    const gap = fractionDistance(left, right);
    const acceptable =
      differentTerms &&
      !fractionValuesEqual(left, right) &&
      (wantsClearGap
        ? compareDistances(gap, REASONING_GAP) >= 0
        : compareDistances(gap, REASONING_GAP) < 0);
    if (acceptable) return [left, right];
    left = drawFraction(random, pool);
    right = drawFraction(random, pool);
  }

  // Sampling failed to find the shape we wanted; a valid, unequal pair from the
  // level's own denominators is still a correct question of that level.
  if (fractionValuesEqual(left, right)) {
    right = { numerator: right.numerator === 1 ? 2 : 1, denominator: right.denominator };
  }
  return [left, right];
}

/**
 * The fractions the "same fraction, different shape" activity builds on, per
 * level: unit and near-unit fractions first, then non-unit fractions whose
 * equivalents need a real multiplication.
 */
const EQUIVALENCE_BASES: Record<FractionDifficultyId, readonly FractionValue[]> = {
  basic: [
    { numerator: 1, denominator: 2 },
    { numerator: 1, denominator: 3 },
    { numerator: 2, denominator: 3 },
    { numerator: 1, denominator: 4 },
    { numerator: 3, denominator: 4 },
  ],
  intermediate: [
    { numerator: 1, denominator: 2 },
    { numerator: 2, denominator: 3 },
    { numerator: 1, denominator: 4 },
    { numerator: 3, denominator: 4 },
    { numerator: 2, denominator: 5 },
    { numerator: 3, denominator: 5 },
  ],
  hard: [
    { numerator: 2, denominator: 3 },
    { numerator: 3, denominator: 4 },
    { numerator: 2, denominator: 5 },
    { numerator: 3, denominator: 5 },
    { numerator: 4, denominator: 5 },
    { numerator: 5, denominator: 6 },
  ],
};

/** Multipliers allowed per level, before the ≤ 12 denominator cap is applied. */
const EQUIVALENCE_MULTIPLIERS: Record<FractionDifficultyId, readonly number[]> = {
  basic: [2],
  intermediate: [2, 3],
  hard: [2, 3, 4],
};

/**
 * A fraction in lowest terms plus the same value written with a bigger
 * denominator. Only bases that can actually be scaled inside the unit's
 * denominator cap take part — scaling one that cannot would quietly produce a
 * model with more parts than the unit ever draws.
 */
export function equivalencePair(
  random: () => number,
  difficulty: FractionDifficultyId,
): { base: FractionValue; equivalent: FractionValue } {
  const multipliersFor = (value: FractionValue) =>
    EQUIVALENCE_MULTIPLIERS[difficulty].filter(
      (multiplier) => value.denominator * multiplier <= FRACTION_MAX_DENOMINATOR,
    );
  const bases = EQUIVALENCE_BASES[difficulty].filter((value) => multipliersFor(value).length > 0);
  const base = pickRandom(random, bases);
  const multiplier = pickRandom(random, multipliersFor(base));
  return {
    base,
    equivalent: { numerator: base.numerator * multiplier, denominator: base.denominator * multiplier },
  };
}
